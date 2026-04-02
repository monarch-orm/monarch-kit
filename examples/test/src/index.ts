import { singleProgram } from "commandstruct";
import { db } from "./db";

singleProgram("monarch-test")
  .action(async () => {
    console.log(db.listCollections());
  })
  .run()
  .then(process.exit);
