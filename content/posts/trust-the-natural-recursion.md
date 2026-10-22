---
title: "Trust the Natural Recursion"
date: 2023-11-07
tags:
  - writing
  - technology
  - programming
---

Most people learn to program by staring at finished solutions and hoping the trick rubs off. That's backwards. Programming is design, and design is a process that can be taught step by step, so that problems far too hard to solve in one leap become a series of small, obvious moves. *How to Design Programs* turns this into a method, the design recipe, worked through in a teaching language as small as Racket's Beginning Student Language. What's worth learning isn't the language. It's the process.

## The recipe

A function is designed in fixed steps, and each step writes the next:

1. **Signature**: what types it consumes and produces.
2. **Purpose**: one line saying what it produces in terms of what it consumes.
3. **Stub**: a placeholder with the right name, the right number of parameters, and a result of the right type, so the program runs before the function exists.
4. **Examples**: concrete calls with their expected results, which become the unit tests.
5. **Template**: the skeleton of the body, taken from the shape of the input data.
6. **Body**: fill in the template, using the examples as your guide.
7. **Test**: run everything and fix what fails.

```racket
;; Number -> Number
;; produce twice the given number
(check-expect (double 3) 6)
(check-expect (double 0) 0)

;(define (double n) 0)        ;stub
;(define (double n) (... n))  ;template

(define (double n)
  (* 2 n))
```

On a function this small it looks like ceremony. It stops looking that way on the twentieth function of a program, when you're stuck and can always ask which step you're on, what that step requires, and whether you've solved something like it before. Writing examples first catches most mistakes before any code exists. If you can't write a specific example, you have no business writing the general function.

## Data first

Before you design functions, design the data. A program lives in two worlds: the problem domain, which holds information, and the program, which holds data. A data definition is the bridge. It states how information is represented as data and how data is read back as information, so that `0` means a red light and not just zero.

Every data definition has a type comment, an interpretation, examples, and a template, and the templates fall out of a small set of forms. Atomic data can't be broken down further. Enumerations are a fixed set of distinct values. Itemizations mix several cases. Compound data bundles fields that belong together. Self-referential data holds an arbitrary amount of information. The function's structure follows the data's structure, so once the data is defined correctly, half the function is already written:

```racket
;; ListOfString is one of:
;;  - empty
;;  - (cons String ListOfString)
;; interp. a list of strings

(define (fn-for-los los)
  (cond [(empty? los) (...)]
        [else
         (... (first los)
              (fn-for-los (rest los)))]))
```

## Trust the natural recursion

Self-reference is probably the most beautiful idea in computing. A well-formed self-referential definition needs one base case that stops the cycle and one case that refers back to itself, and from those two lines you get data of any size: every student in a school, every file on a disk.

The template's self-reference becomes a recursive call, the *natural recursion*. The rule is to trust it. Don't trace the whole computation in your head. Assume the recursive call returns the right answer for the rest of the data, and only decide what to do with the first piece. Here's the height of a binary search tree:

```racket
(define (height t)
  (cond [(false? t) 0]
        [else
         (+ 1 (max (height (node-l t))
                   (height (node-r t))))]))
```

Two self-references, one per subtree, and the function is three lines long because the data definition already did the thinking. Arbitrary-arity trees, like folders inside folders, need two cycles in the type graph. A list that refers to itself gives arbitrary breadth, and an element that refers to a list of elements gives arbitrary depth. That's mutual reference, and the functions over it come in mutually recursive pairs, designed together.

## Simplify at the model level

A real designer simplifies before writing code. When a function consumes two one-of types, lay their cases out as a cross-product table. Each cell is a test case, cells with the same result merge into one `cond` clause, and the body is half-planned before any code exists.

Abstraction applies the same move to repetitive code. Pull out the identical parts, pass in the parts that differ, and you get higher-order functions whose signatures say exactly what they do:

```racket
;; (X -> Y) (listof X) -> (listof Y)        map
;; (X -> Boolean) (listof X) -> (listof X)  filter
;; (X Y -> Y) Y (listof X) -> Y             foldr
```

Once you know these signatures, many functions become one-liners. When the function you pass in needs a parameter of the outer function, define it locally, and it becomes a closure that captures that value. `local` also fixes a classic bug: a recursive call evaluated twice inside one expression doubles the work at every level of a tree, turning a linear search exponential. Compute it once, name it, and reuse it. But design first and optimise afterwards, and only where measurement shows a problem.

## When structure isn't enough

Some problems don't break along the lines of their data. In generative recursion, each recursive call gets a newly generated problem instead of a piece of the input, as with fractals, sorting by partition, or search. Since nothing guarantees it stops, every generative function needs a termination argument: the trivial case, how each step reduces the problem, and why that reduction must reach the trivial case. Sudoku becomes a generated tree of candidate boards, searched by backtracking. The design blends three templates: generative recursion, an arbitrary-arity tree, and backtracking search.

Accumulators recover what structural recursion forgets. Structural recursion knows where it is, but not where it has been or where it still has to go. A context-preserving accumulator remembers the past. A result-so-far accumulator lets the recursive call sit in tail position, so pending work doesn't pile up on the stack:

```racket
(define (sum lon)
  (local [(define (sum lon acc)
            (cond [(empty? lon) acc]
                  [else (sum (rest lon) (+ acc (first lon)))]))]
    (sum lon 0)))
```

The tail-recursive pattern is what `foldl` captures, while `foldr` stays naturally recursive. A worklist accumulator takes it further, letting a tail-recursive walk cover a whole arbitrary-arity tree as one straight-line depth-first traversal. Graphs, where nodes can be shared and arrows can form cycles, need one more piece: an accumulator of visited nodes, so the walk doesn't loop forever.

## Where this leads

The most important property of a program isn't speed or cleverness. It's being easy to change, because any program with users will have to change. The recipe produces exactly that: constants as single points of control, small functions with one job each, tests that already document the behaviour, and helpers encapsulated so the rest of the program sees only what it needs. Scale that up and you have modules: you import the published names and never see the private definitions behind them.

Hard programs don't come from solving hard problems in one leap. They come from small steps you can trust. Get the data right, follow the template, and trust the natural recursion.
