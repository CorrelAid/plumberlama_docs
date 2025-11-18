import postgres from 'postgres';

const pg = postgres(import.meta.env.POSTGRES_URL, {
    connect_timeout: 30,
    idle_timeout: 30,
    max_lifetime: 0,
    max: 2,
});

export default pg;