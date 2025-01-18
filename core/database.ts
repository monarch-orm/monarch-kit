export class Database {
  public async list() {
    await new Promise((res) => setTimeout(res, 2000));
    return ["monarch-test", "monarch-staging", "monarch-prod"];
  }
}
