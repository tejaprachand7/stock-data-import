Pre-requisite :

- Install nodejs on the local instance and setup the environment variables.
Source : https://nodejs.org/en

Follow these steps to setup the application locally -

1. clone this github repository onto your local instance.
2. run the following command from the root directory of this application

npm install

This should install all the required dependencies of the app.

3. Open the app in an IDE.
4. Editing the data-config json file

The app intends to scaled and driven via a single source of truth - the data config. 
This design becomes key when the app needs to be scaled to import additional data.
Everything that is dynamic must be provided via the data config and the application will execute the logic based on the configuration.

Take some time to edit the configuration to suit your customisations.

5.


- Install PostgreSQL and TimeScale DB from the following link : https://docs.timescale.com/self-hosted/latest/install/installation-windows/
- You can reference this video : https://www.youtube.com/watch?v=KlOGfFzLdqA&t=341s
- Then, download and install pgAdmin through the .exe file from : https://www.postgresql.org/ftp/pgadmin/pgadmin4/v9.3/windows/
- Create a new database using the pgAdmin in the PostgreSQL server.
- run the following script in the 'query tool' of DB in the left side panel, to initialze the db setup for equities and sme market data.

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE SCHEMA IF NOT EXISTS equities_and_sme;

CREATE TABLE equities_and_sme.market_data (
    date DATE NOT NULL,
    symbol VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    open_price NUMERIC(16,2) NOT NULL,
    high_price NUMERIC(16,2) NOT NULL,
    low_price NUMERIC(16,2) NOT NULL,
    close_price NUMERIC(16,2) NOT NULL,
    last_price NUMERIC(16,2) NOT NULL,
    prev_close_price NUMERIC(16,2) NOT NULL,
    total_trading_vol NUMERIC(20,2) NOT NULL,
    total_transfer_val NUMERIC(20,2) NOT NULL,
    avg_price NUMERIC(16,2) NOT NULL,
    total_traded_qty NUMERIC(20,2) NOT NULL,
    no_of_trades INTEGER NOT NULL,
    deliverable_qty NUMERIC(20,2) NOT NULL,
    deliverable_percentage NUMERIC(8,2) NOT NULL,
    PRIMARY KEY (date, symbol)
);

SELECT create_hypertable('equities_and_sme.market_data', 'date');

CREATE INDEX idx_eq_sme_market_data_symbol ON equities_and_sme.market_data (symbol);


6. Creating the process.env file in the root directory of the file.

Set the following variables in the .env file

DATA_SERVER_HOST=<your_db_server_host_name>
DATA_SERVER_PORT=<db_server_port>
DATABASE=<name_of_the_database>
DATABASE_USER=<username_to_authenticate>
DATABASE_PASSWORD=<password_to_authenticate>

7. 