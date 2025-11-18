import { SQL } from "bun";

const pg = new SQL({
    url: "postgres://plumberlama:plumberlama_dev@localhost:5432/survey_data",
    connectionTimeout: 30, // Timeout when establishing new connections
    idleTimeout: 30, // Close idle connections after 30s
    maxLifetime: 0, // Connection lifetime in seconds (0 = forever)
    max: 2, // Maximum connections in pool
});

export default pg;