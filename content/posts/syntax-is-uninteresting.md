---
title: "Syntax Is Uninteresting"
date: 2019-01-22
tags:
  - writing
  - technology
  - programming
---

Programmers argue endlessly about braces, semicolons, and indentation, and none of it matters. Syntax is the least interesting part of a programming language. What matters is semantics: what programs mean and how they evaluate. Learn the semantics, and every new language is just new spelling. Standard ML, the austere little functional language behind the University of Washington's Programming Languages course, is the best place to see this, because it has almost nothing else to distract you.

## What a language is

Every language has five parts: syntax (how you write it), semantics (what it means), idioms (the typical patterns for expressing a computation), libraries, and tools. Libraries and tools are crucial, but you pick them up on the job. Semantics and idioms are what carry over from one language to the next.

ML makes the semantics explicit. Every expression is checked twice. First it is type-checked in a *static environment*, before the program runs. Then it is evaluated in a *dynamic environment* as it runs, producing a value. Every value is an expression, but not every expression is a value. Each new construct is learned the same way: its syntax, its type-checking rule, and its evaluation rule. Once you have those three, you have the whole thing.

In principle all languages are the same. By the Church–Turing thesis, anything one can compute, another can too. In practice they are as different as cultures, because what is natural in one is awkward in another. Beware the Turing tarpit, where everything is possible and nothing is easy.

## Three ways to build a type

Under the surface, every language builds compound data from the same three blocks:

- **Each-of**: a value contains one of each of several things (tuples, records, structs).
- **One-of**: a value is exactly one of several variants (options, enums, tagged unions).
- **Self-reference**: a value can contain other values of the same type (lists, trees).

ML shows how small the core really is. Tuples aren't even a separate feature. They're syntactic sugar for records with fields named `1`, `2`, `3`. A `datatype` binding builds one-of types directly, and a `case` expression takes them apart:

```sml
datatype exp = Constant of int
             | Negate of exp
             | Add of exp * exp
             | Multiply of exp * exp

fun eval e =
    case e of
        Constant i => i
      | Negate e1 => ~ (eval e1)
      | Add (e1, e2) => eval e1 + eval e2
      | Multiply (e1, e2) => eval e1 * eval e2
```

That's a complete expression evaluator in ten lines. Pattern matching beats checking and extracting by hand because the compiler holds you to it. It warns if you forget a case, rejects a duplicated one, and never lets you extract data from the wrong variant, so the "head of an empty list" crash can't happen.

## Everything is a pattern

The deepest surprise is that pattern matching isn't one feature among many. It's the whole language. `val` bindings match patterns. Function arguments are patterns. Lists and options aren't built-in magic either. They're ordinary datatypes whose constructors happen to be `[]`, `::`, `NONE`, and `SOME`.

Which means every ML function takes exactly one argument. A "three-argument" function takes one tuple and matches it against a tuple pattern:

```sml
fun rotate_left (x, y, z) = (y, z, x)
fun rotate_right t = rotate_left (rotate_left t)
```

`rotate_right` never unpacks anything. It passes one triple straight through. Zero arguments is just the unit pattern `()` matching the unit value. Nested patterns go further still, matching on the shape of several lists at once and replacing whole towers of `if` and `case` with a few lines that read like a specification.

## No mutation, no aliasing

ML data is immutable by default. That looks like a missing feature, and it's actually a superpower. Without mutation, no code can ever tell whether two names point to the same data or to identical copies. So you can share structure freely and never think about aliasing at all, while programmers in mutable languages have to obsess over object identity and defensive copies.

Mutation still exists, deliberately and visibly, as `ref` cells for the cases where the world really does change state. The default is what matters. When nothing changes behind your back, a function's meaning depends only on its inputs.

## Functions as values

Functional programming comes down to two ideas: avoid mutation, and treat functions as values. A function can be passed, returned, and stored like anything else. It's a *closure*: its code plus the environment where it was defined. Lexical scope means a function's meaning is fixed where it's written, not where it happens to be called, which is why it can be type-checked and reasoned about locally.

From that come `map`, `filter`, and `fold`, which do the work of nearly every loop. Currying makes every function a chain of one-argument functions, so supplying some arguments gives you a new function waiting for the rest:

```sml
val sum = List.foldl (fn (x, acc) => x + acc) 0
```

And recursion loses nothing to loops. A call in tail position reuses its stack frame, so an accumulator-passing function runs in constant space, as efficiently as a loop and without a mutable counter.

## Types you never write

ML is statically typed and yet almost never needs a type annotation. Type inference gives every binding the most general type that makes the program check, and fails only if none exists. Sometimes it finds more generality than you intended: a function that never uses its middle argument gets a type variable `'a` there, and that's fine, since a more general type is always acceptable.

Modules scale the same discipline up. A signature is the type of a module. Anything left out of it is private, and an abstract type hides its own representation entirely. Two modules matching the same signature can implement it completely differently, and no client can tell. That's the point. Abstraction is a promise of equivalence: given equal inputs, a replacement produces equal results, terminates the same way, and has the same effects. Engineers reason about equivalence at three levels: semantic (same behaviour), asymptotic (same growth), and system (same real-world speed). Knowing which one you're claiming is half of every refactor and every optimisation.

## Where this leads

Functional languages have always been ahead of their time. Garbage collection, generics, type inference, closures, higher-order functions: each was dismissed as an academic toy and then, a decade or two later, quietly adopted by every mainstream language. The people designing these languages are usually right. The industry just takes a while to catch up.

So learn the ideas, not the spelling. Syntax is uninteresting. Semantics is forever.
