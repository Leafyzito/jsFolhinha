// keeps the synced in-memory collections up to date with writes from anywhere (website, scripts, atlas ui)

const MAX_RETRY_DELAY = 30_000;
// errors where resuming from our token can't work, reload instead
const UNRESUMABLE_CODES = new Set([
  280, // ChangeStreamFatalError
  286, // ChangeStreamHistoryLost
]);

function importantLog(text) {
  console.warn(text);
  global.fb?.discord?.importantLog?.(text);
}

class ChangeSync {
  // reload() must refill the collections and resolve to the cluster time it started at
  constructor(db, collections, reload) {
    this.db = db;
    this.collections = collections; // name -> FullCollection
    this.reload = reload;
    this.stream = null;
    this.stopped = true;
    this.failures = 0;
    this.retryTimer = null;
  }

  async start() {
    this.stopped = false;
    const startAt = await this.reload();
    this.open(startAt ? { startAtOperationTime: startAt } : {});
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    const stream = this.stream;
    this.stream = null;
    await stream?.close().catch(() => {});
  }

  open(options) {
    const stream = this.db.watch(
      [
        {
          $match: {
            "ns.coll": { $in: Object.keys(this.collections) },
            operationType: { $in: ["insert", "update", "replace", "delete"] },
          },
        },
      ],
      { fullDocument: "updateLookup", ...options }
    );
    this.stream = stream;
    this.consume(stream);
  }

  async consume(stream) {
    try {
      while (!this.stopped && stream === this.stream) {
        const change = await stream.next();
        this.apply(change);
        this.failures = 0;
      }
    } catch (err) {
      // close() during stop or a restart also lands here
      if (this.stopped || stream !== this.stream) {
        return;
      }
      this.handleFailure(stream, err);
    }
  }

  apply(change) {
    const collection = this.collections[change.ns?.coll];
    if (!collection) {
      return;
    }

    if (change.operationType === "delete") {
      collection.remove(change.documentKey._id);
      return;
    }

    // update lookup comes back empty when the doc got deleted after the change
    if (change.fullDocument) {
      collection.upsert(change.fullDocument);
    } else {
      collection.remove(change.documentKey._id);
    }
  }

  handleFailure(stream, err) {
    const resumeToken = stream.resumeToken;
    this.stream = null;
    stream.close().catch(() => {});

    this.failures++;
    const delay = Math.min(1000 * 2 ** (this.failures - 1), MAX_RETRY_DELAY);
    const canResume =
      resumeToken && !UNRESUMABLE_CODES.has(err.code) && this.failures < 3;

    importantLog(
      `* db change stream failed (${err.code ?? "?"}: ${err.message}), ${
        canResume ? "resuming" : "reloading cache"
      } in ${delay / 1000}s`
    );

    this.retryTimer = setTimeout(async () => {
      if (this.stopped) {
        return;
      }
      try {
        if (canResume) {
          this.open({ startAfter: resumeToken });
        } else {
          const startAt = await this.reload();
          this.open(startAt ? { startAtOperationTime: startAt } : {});
        }
      } catch (retryErr) {
        this.handleFailure({ resumeToken, close: async () => {} }, retryErr);
      }
    }, delay);
  }
}

module.exports = ChangeSync;
