require("dotenv").config();
const { createClient } = require("@clickhouse/client");

class ClickHouseClient {
  constructor() {
    this.client = null;
    this.isConnected = false;

    // Configuration from environment variables
    this.config = {
      host: process.env.CLICKHOUSE_HOST || "localhost",
      port: process.env.CLICKHOUSE_PORT || "8123",
      username: process.env.CLICKHOUSE_USERNAME,
      password: process.env.CLICKHOUSE_PASSWORD,
      database: process.env.CLICKHOUSE_DATABASE,
      protocol: "http",
    };
  }

  async init() {
    if (
      !process.env.CLICKHOUSE_HOST ||
      !process.env.CLICKHOUSE_PORT ||
      !process.env.CLICKHOUSE_USERNAME ||
      !process.env.CLICKHOUSE_PASSWORD ||
      !process.env.CLICKHOUSE_DATABASE
    ) {
      // don't connect to clickhouse
      return;
    }

    try {
      // Create ClickHouse client
      this.client = createClient({
        url: `http://${this.config.host}:${this.config.port}`,
        username: this.config.username,
        password: this.config.password,
        database: this.config.database,
      });

      // Test connection
      await this.testConnection();
      this.isConnected = true;
      console.info("* ClickHouse client connected successfully");
    } catch (error) {
      console.error("Failed to initialize ClickHouse client:", error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const result = await this.client.query({
        query: "SELECT 1 as test",
      });
      return result;
    } catch (error) {
      console.error("ClickHouse connection test failed:", error);
      throw error;
    }
  }

  async query(sql, params = {}) {
    try {
      if (!this.isConnected) {
        await this.init();
      }

      const result = await this.client.query({
        query: sql,
        query_params: params,
      });

      const data = await result.json();

      // Return just the data array for easy use
      // Each row is an object with column names as keys
      return data;
    } catch (error) {
      console.error("ClickHouse query error:", error);
      throw error;
    }
  }

  async queryWithMeta(sql, params = {}) {
    try {
      if (!this.isConnected) {
        await this.init();
      }

      const result = await this.client.query({
        query: sql,
        query_params: params,
      });

      const data = await result.json();

      return {
        data: data,
        query_id: result.query_id,
        statistics: result.statistics,
        rowCount: data.length,
      };
    } catch (error) {
      console.error("ClickHouse query error:", error);
      throw error;
    }
  }

  async ping() {
    try {
      const result = await this.query("SELECT 1 as ping");
      return result.length > 0;
    } catch (error) {
      console.error("ClickHouse ping failed:", error);
      return false;
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.close();
        this.isConnected = false;
        console.info("ClickHouse client connection closed");
      }
    } catch (error) {
      console.error("Error closing ClickHouse client:", error);
    }
  }
}

module.exports = ClickHouseClient;
