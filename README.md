# ChatAppServer

This project frontend is made with Angular and that is already included in the `dist` directory. If you want to change the frontend you can find the repo [here](https://github.com/ChuyCantu/ChatAppClientAngular).

You can find the live version hosted in heroku [here](https://nd-chatapp.herokuapp.com)

## How to use?

Run `npm install` to install all the dependencies.

Make sure you have an instance of `Postgres` running and create the `environmental variables` or an `.env` file with the names inside the `.env.example` file.

Once Postgres and the variables are set up, run the database migrations with `npx sequelize-cli db:migrate`. If you need to undo a migration you can run `npx sequelize-cli db:migrate:undo`.
For more information about Sequelize migrations see [here](https://sequelize.org/docs/v6/other-topics/migrations/).

## Development server

Run `npm run dev` for a dev server. Navigate to `http://localhost:4000/` (or the port you specified in the variable PORT).

## Production server

Run `npm start` for the production server. 

NOTE: Right now the `src/app.js` and the `src/server.js` include as origin my heroku application, so make sure you change it or otherwise the application won't run properly.

