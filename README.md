# What is Beeline?

Beeline is a command-line interface for managing SQL database migrations. It works with standard SQL files, tracks migration history, and supports the ability to roll back changes. Currently, Beeline is compatible with Postgres, but support for other databases may be added in the future.

# Installation Instructions

Beeline can be downloaded from the NPM repository called `beelinedb` and installed globally
on your local machine under the alias `beeline` using the following command:

```sh copy
npm install -g beeline@npm:beelinedb
```

You do not have to use an alias, but please be aware that most of the examples in this document assume its use and you may need to make adjustments if you choose not to use it (i.e. replace `beeline` with `beelinedb` when you see it in the examples)

You can test that Beeline has been installed correctly by attempting to access the Beeline help menu from the command line. If everything is working properly, you will see a list of the commands currently supported by Beeline.

```
$ beeline --help
beeline <command>

Commands:
  beeline info                print latest info on migration
  beeline make <name> [type]  Create a blank sql file for migration queries
  beeline migrate             run most recent migration scripts
  beeline undo                undo most recent migration

Options:
  --version  Show version number                                       [boolean]
  --config   Specify optional config file                               [string]
  --table    schema history table                                       [string]
  --help     Show help                                                 [boolean]
```

# Mastering the Basics: A Step-by-Step Guide to Beeline

### Step 1 - Use Docker to setup Postgres

For this tutorial, you will need to install and configure a Postgres database on your local computer. You can easily do so by following these steps:

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) on your machine.
2. Use the official Postgres Docker image by running the following command:

```
docker run --name postgres-db -e POSTGRES_PASSWORD=docker -p 5432:5432 -d postgres
```

This command will start a Postgres server running in the background, and it will also set a password and port for accessing the server externally. You can verify that the server is running with the following Docker command:

```
docker ps
```

This should produce an output similar to the following:

```
CONTAINER ID   IMAGE      COMMAND                  CREATED          STATUS          PORTS                    NAMES
85039ba6b161   postgres   "docker-entrypoint.s…"   35 minutes ago   Up 35 minutes   0.0.0.0:5432->5432/tcp   postgres-db
```

Next, you will need to create a blank database to store the data and migration tables used in the remainder of this tutorial. To do so, you can log in to the psql shell with this command:

```
docker exec -it postgres-db psql -U postgres
```

Then, at the promt, you can create a blank database called `tutorial` by running the following command:

```sql
create database tutorial;
```

Exit the `pqsl` shell by typing `\q`.

### Step 2 - Create the initial migration files

With the database setup complete, you are now ready to generate files for the initial migration. To do so, you can use the `beeline make` command with the -u option. This will generate an additional SQL file for undoing the migration, which will allow you to easily roll back any changes made during the migration if needed.

```sh
beeline make initial major -u
```

You should see the following output:

```
Succesfully created migration file(s): V1.0.0__initial.sql, U1.0.0__initial.sql
```

By default, `beeline make` will save the files into a local directory called `./sql`. You can specify a different directory using the `--migrationDirectory` option.

### Step 3 - Add SQL to the migration files

To customize the migration process, you can add any desired SQL statements to the migration files that have been created. These statements will be executed during the migration process. For this example, let's add a new table called `person`. Open the file called `V1.0.0__initial.sql` and add the following SQL statement:

```sql filename="V1.0.0__initial.sql"
CREATE TABLE person (
  id UUID PRIMARY KEY default gen_random_uuid(),
  first VARCHAR,
  last VARCHAR
);
```

To undo the migration, you can add the following code to the file named `U1.0.0__initial.sql`.

```sql filename="U1.0.0__initial.sql"
DROP TABLE person;
```

### Step 4 - Run the migration

To perform the migration defined above, simply run the following command:

```
beeline migrate --url localhost:5432/tutorial --user postgres --password docker
```

Notice that in the url option, you must specify the port number and database name for the Postgres server. You should also use the default postgres user and password that you specified when starting the Postgres server earlier.

You can verify that the migration completed successfully by running the `beeline info` command:

```
beeline info --url localhost:5432/tutorial --user postgres --password docker
```

You should see output similar to this:

```
-------------------------------------------------------------------------------------------------------------------------------------------------
 sequence   version   description   undoable         script                        hash                 installed_by         installed_at
---------- --------- ------------- ---------- --------------------- ---------------------------------- -------------- ---------------------------
        1   1.0.0       Initial     true       V1.0.0__initial.sql   9b8e59be8d602ecd7ba323b6e9dea79b   postgres       2023-01-02T03:22:27-06:00
```

### Step 5 - Add a new column and table to the database

Now, let's modify the person table by adding a new column to store an email address, and also create a new table called pets.

First, make a new set of migration files by running the following command:

```
beeline make add_pets_table minor -u
```

You should see the following results:

```
Succesfully created migration file(s): V1.1.0__add_pets_table.sql, U1.1.0__add_pets_table.sql
```

To make the changes mentioned above (i.e., adding the pets table and a new column to store an email address), you can add the following SQL statements to the file named V1.1.0\_\_add_pets_table.sql.

```sql filename="V1.1.0__add_pets_table.sql"
CREATE TABLE pet (
  id UUID PRIMARY KEY default gen_random_uuid(),
  type VARCHAR,
  name VARCHAR,
  person_id UUID,
  FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE
);

ALTER TABLE person ADD email VARCHAR;
```

To undo the migration, you can add these SQL statements to the file named U1.1.0\_\_add_pets_table.sql.

```sql filename="U1.1.0__add_pets_table.sql"
DROP TABLE pet;

ALTER TABLE person DROP email;
```

Finally, you can perform the migration to make these changes to the database by running the `beeline migrate` command again:

```
beeline migrate --url localhost:5432/tutorial --user postgres --password docker
```

Again, you can verify the results with the `beeline info` command:

```
beeline info --url localhost:5432/tutorial --user postgres --password docker
```

```
-----------------------------------------------------------------------------------------------------------------------------------------------------------
 sequence   version    description     undoable             script                           hash                 installed_by         installed_at
---------- --------- ---------------- ---------- ---------------------------- ---------------------------------- -------------- ---------------------------
        1   1.0.0        Initial       true       V1.0.0__initial.sql          dfb516dd42f237d8c285555b245f29f5   postgres       2023-01-02T17:43:12-06:00
        2   1.1.0     Add pets_table   true       V1.1.0__add_pets_table.sql   be372d29c97aedd234db9142e97b0967   postgres       2023-01-02T17:44:30-06:00
```

### Step 6 - Rollback the most recent migration

You can rollback to the previous database configuration by running the `beeline undo` command as follows:

```
beeline undo --url localhost:5432/tutorial --user postgres --password docker
```

To verify, you can use the `beeline info` command:

```
beeline info --url localhost:5432/tutorial --user postgres --password docker
```

You should see that the database has been rolled back to its previous state.

```
-------------------------------------------------------------------------------------------------------------------------------------------------
 sequence   version   description   undoable         script                        hash                 installed_by         installed_at
---------- --------- ------------- ---------- --------------------- ---------------------------------- -------------- ---------------------------
        1   1.0.0       Initial     true       V1.0.0__initial.sql   dfb516dd42f237d8c285555b245f29f5   postgres       2023-01-02T17:43:12-06:00
```

### Step 7 - In Summary

This tutorial showed you the basics on how to use Beeline to help you manage the process of migrating your databases. You can refer to the [command reference](https://www.beelinedb.com/refersection) for a full analysis of all the features available in Beeline.
