import { createClient, createDatabase } from "monarch-orm";
import { schemas } from "./schemas";

const client = createClient("mongodb://localhost:27017/test");

export const db = createDatabase(client.db(), schemas);
