import Redis from "ioredis";

test("mock redis works", async () => {
  const redis = new Redis();
  await redis.set("foo", "bar");
  const value = await redis.get("foo");
  expect(value).toBe("bar");
});
