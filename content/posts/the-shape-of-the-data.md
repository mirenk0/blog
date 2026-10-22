---
title: "The Shape of the Data"
date: 2019-06-22
tags:
  - writing
  - technology
  - programming
---

Every database does the same job: store data and give it back when asked. What differs is the shape of data each one is built for. Choosing a database isn't about picking the most powerful or the newest. It's about matching the tool to the shape of your data, and then, more often than not, picking the boring option.

## One job, four shapes

A spreadsheet is already a database: rows of records, columns of fields, a schema describing what goes where. Everything else is a variation on that idea, tuned for a different shape.

- **Relational** databases store tables that refer to one another. The data is highly structured, and the schema is defined up front.
- **Document** databases store collections of self-contained objects that don't all have to share the same fields.
- **Graph** databases store things and the relationships between them, with the relationships as first-class data.
- **Key-value** stores are the world's largest hash map: a key goes in, a value comes out.

Around them sit specialists: search engines for full-text search, wide-column stores for enormous scale, and message brokers for streams of events. "SQL" and "NoSQL" are mostly marketing terms. The useful question is always what your data looks like.

## Tables and joins

The relational model's power is the single source of truth. A username is stored once, in one table, and everything that needs it refers to that row by key. A foreign key makes the relationship explicit, and the database enforces it: delete a user, and `ON DELETE CASCADE` removes their comments too, instead of leaving orphans.

The join is what pays for all that structure. It reassembles normalised data at query time:

```sql
SELECT boards.board_name, COUNT(comment_id) AS comment_count
FROM comments
RIGHT JOIN boards ON boards.board_id = comments.board_id
GROUP BY boards.board_name
ORDER BY comment_count;
```

That query has two traps. An inner join would silently drop boards with no comments, which are exactly the ones you're looking for. And `COUNT(*)` would count the empty row as one comment, while `COUNT(comment_id)` skips the null and correctly reports zero. Most real work needs only inner and left joins, but you have to understand all of them to know which one you need.

When some data really has no fixed shape, Postgres can store it in a `JSONB` column, validate it, and still query into it with `->` and `->>`. The relational world has learned to borrow from the document one.

## Documents

Document databases let you insert first and design later. That makes them easy to get running, and that's the danger. Schemaless doesn't mean the data has no schema. It means the schema has moved out of the database and into your code, where nothing enforces it.

Where they shine is with collections of differently shaped objects, and with aggregation pipelines that filter, bucket, and summarise data in stages:

```javascript
db.pets.aggregate([
  { $match: { type: "dog" } },
  { $bucket: { groupBy: "$age", boundaries: [0, 3, 9, 15],
               default: "very senior", output: { count: { $sum: 1 } } } },
  { $sort: { count: -1 } },
]);
```

## Graphs

Some data is mostly relationships: actors and films, employees and managers, users and friends. A relational database can model these with join tables, but questions like "how is this person connected to that one?" turn into a pile of self-joins. A graph database makes relationships the core data, and its queries read like the pictures you'd draw on a whiteboard:

```cypher
MATCH path = shortestPath(
  (a:Person {name: "Kevin Bacon"})-[*]-(b:Person {name: "Keanu Reeves"})
)
RETURN length(path);
```

That's six degrees of Kevin Bacon in four lines. Change the pattern to `-[:ACTED_IN*1..4]-` and you have the core of a recommendation engine.

## Keys, values, and caches

A key-value store is usually a companion to a database, not the main one. Its job is speed. Cache an expensive query's result under a namespaced key like `user:alice`, set a time-to-live, and serve repeat requests without touching the main database. It also holds session state, so your app servers can stay stateless and scale horizontally.

The rule is simple: never store anything there that you can't afford to lose. And caching is harder than it looks. When a popular key expires, a thousand simultaneous requests can miss the cache together and all recompute the same result: the thundering herd. The fix is to have the application only ever read the cache, and let a background job keep it fresh.

## The guarantees you pay for

ACID is the contract a serious database offers:

- **Atomicity**: a transaction happens completely or not at all.
- **Consistency**: every transaction leaves the data valid under its constraints.
- **Isolation**: concurrent transactions behave as if they ran one after another.
- **Durability**: once a transaction is committed, it survives a crash.

Banks drove decades of database development for exactly these properties. They're also expensive: waiting for a disk write on every commit is slow, so know which guarantees you actually need.

Every system needs the same operational basics. Indexes trade write speed and storage for fast reads, so run `EXPLAIN`, look for full scans on hot paths, and index those, not everything. Replication keeps you online when a server dies, but reads from secondaries are only eventually consistent, which is fine for a photo feed and unacceptable for a bank balance. Sharding scales further at a steep cost in complexity, so don't reach for it lightly. And never build a query by pasting user input into a string. `WHERE board_id = $1` with a parameter makes `1; DROP TABLE users; --` harmless.

## Where this leads

Choosing a database comes down to a few questions. Is your data relational, unstructured, a graph, or just keys? Where are your hot paths for reads and writes? Is there a good driver for your language? What will it cost to run, and to hire someone who can run it? Weigh your own experience too, because some knowledge only comes from having been burned.

Then be boring. Proven technology lets you spend your time on the product instead of fighting the new shiny thing. Don't cache before you've measured, because every layer of indirection is another place for bugs to hide.

Match the database to the shape of the data, and when in doubt, pick the boring one.
