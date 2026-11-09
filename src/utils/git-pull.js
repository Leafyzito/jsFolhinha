const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// The bot runs as root inside Docker with the repo bind-mounted, so a plain
// `git pull` would leave root-owned files that break git for the host user.
// When running as root, run git as whoever owns the repo instead.
function gitExecOptions(cwd) {
  const options = { cwd };
  if (process.getuid?.() !== 0) return options;

  try {
    const { uid, gid } = fs.statSync(path.join(cwd, ".git"));
    if (uid === 0) return options;
    // HOME=/tmp keeps git away from root's unreadable home directory.
    return { ...options, uid, gid, env: { ...process.env, HOME: "/tmp" } };
  } catch {
    return options;
  }
}

const gitPull = (cwd = process.cwd()) => {
  return new Promise((resolve) => {
    exec("git pull", gitExecOptions(cwd), (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
};

module.exports = { gitPull };
