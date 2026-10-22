---
title: "Write the Interpreter"
date: 2019-01-31
tags:
  - writing
  - technology
  - programming
---

The fastest way to understand programming languages is to build one. Closures, scope, laziness, and types stop being mysteries the moment you have to implement them yourself, and the folklore about "compiled languages" and "interpreted languages" falls apart with them. Racket, a descendant of Scheme with almost no syntax to get in the way, is the right tool for the job.

## Code is a tree

Racket's syntax fits in three lines. A term is an atom (`#t`, `34`, `"hi"`, `x`), a special form (`define`, `lambda`, `if`), or a sequence of terms in parentheses. If the first term of a sequence is a special form, it has its own rules. Otherwise the sequence is a function call.

The parentheses people complain about are the point. Because everything is parenthesised, parsing is trivial and unambiguous: atoms are leaves, sequences are nodes, and the program text already is its syntax tree. HTML uses the same model with far uglier brackets, and nobody calls it unreadable. Parentheses do carry meaning, though: `(e)` calls `e`, and `((e))` calls the result. You can't sprinkle them for decoration.

## Delaying evaluation

Function arguments are evaluated eagerly, before the call. To delay a computation, wrap it in a function. A zero-argument function used this way is a *thunk*, and thanks to closures it can run later with every variable it needs. A thunk skips work you might never need, but it redoes the work if you call it twice. Add a mutable cell to remember the result and you have a *promise*, which is lazy evaluation built from two primitives:

```racket
(define-syntax my-delay
  (syntax-rules ()
    [(my-delay e) (mcons #f (lambda () e))]))

(define (my-force p)
  (if (mcar p)
      (mcdr p)
      (begin (set-mcar! p #t)
             (set-mcdr! p ((mcdr p)))
             (mcdr p))))
```

The same trick builds infinite data. A stream is a thunk that, when called, returns a pair of the next value and the thunk for the rest:

```racket
(define powers-of-two
  (letrec ([f (lambda (x) (cons x (lambda () (f (* x 2)))))])
    (lambda () (f 2))))
```

The producer knows how to make any number of values, and the consumer decides how many to take. Unix pipes, event loops, and sensor feeds all follow the same division of labour. Go one step further and keep a cache of previous results keyed by argument. That's memoization, and on recursive functions like Fibonacci it turns exponential time into linear.

## Macros, done right

A macro is syntactic sugar you define yourself: a rewrite from new syntax to existing syntax, done before the program runs. `my-delay` above has to be a macro, because a function would evaluate `e` eagerly, which is exactly what it's trying to avoid.

Most macro systems are dangerous. C's preprocessor rewrites raw text, so macros need defensive parentheses everywhere and local variables with names like `__strange_name34` to avoid capturing the caller's variables. Racket's macros are *hygienic*. They work on tokens and scopes rather than characters, secretly rename their own local variables, and look up free names where the macro was defined, not where it's used:

```racket
(define-syntax double
  (syntax-rules ()
    [(double x) (let ([y 1]) (* 2 x y))]))

(let ([y 7]) (double y))   ; 14, not 2
```

A naive expansion would capture the caller's `y` and return 2. Hygiene makes macros modular. It doesn't make them a good idea. When a function will do, use a function.

## Write the interpreter

To implement a language B in a metalanguage A, skip the parser at first: write B's programs directly as syntax trees in A. Racket structs make this painless, with one struct per kind of expression giving you a constructor, a tester, and accessors. The interpreter is a single recursive function over the tree, carrying an environment that maps names to values.

The heart of it is closures. A function isn't a value. A *closure* is: the function paired with the environment where it was defined. Calling one evaluates the body in the closure's environment, extended with the argument, and not in the environment of the call site. That one rule is lexical scope:

```racket
(define (eval-under-env e env)
  (cond [(int? e) e]
        [(var? e) (cdr (assoc (var-s e) env))]
        [(fun? e) (closure env e)]
        [(call? e)
         (let ([c (eval-under-env (call-f e) env)]
               [v (eval-under-env (call-actual e) env)])
           (if (closure? c)
               (let ([f (closure-f c)])
                 (eval-under-env (fun-body f)
                                 (cons (cons (fun-arg f) v)
                                       (closure-env c))))
               (error "call applied to non-function")))]
        ...))
```

Real implementations save space by storing only a function's *free variables*, the names its body uses but doesn't bind, computed once before the program runs. And macros for the new language turn out to be ordinary metalanguage functions that build syntax trees, with no change to the interpreter at all.

Build one and the folklore falls away. There's no such thing as a compiled language or an interpreted language. Interpretation and compilation are properties of an implementation, not of a language. Java compiles to bytecode, which is interpreted, then hot code is compiled to machine code at run time, and the processor itself translates that machine code into micro-operations. When someone says C is fast because it's compiled and Lisp is slow because it's interpreted, politely correct them.

## Static versus dynamic

Racket has no datatype bindings, and doesn't need them. Every value carries a tag that can be checked at run time with `number?`, `string?`, `pair?`, and so on. ML checks everything statically instead. From Racket's side, ML is a well-behaved subset. From ML's side, Racket is one giant datatype.

A static type system that prevents some bad behaviour X is *sound* if it never accepts a program that does X, and *complete* if it never rejects one that doesn't. Sound is the goal. Complete is impossible: almost every interesting static property is undecidable, so no checker can always terminate, be sound, and be complete at once. Then there's weak typing, as in C and C++, where programs pass every static check and then, given an out-of-bounds index, are allowed to do literally anything.

The static-versus-dynamic war has good arguments on both sides. Static typing catches bugs early, drops runtime tag checks, and hands you a to-do list when you change a type. Dynamic typing lets incomplete programs run while you prototype, accepts useful programs a type checker would reject, and lets functions widen what they accept without breaking callers. Neither wins outright. The better question is what, specifically, you want enforced before the program runs.

## Where this leads

Every feature in this tour, including thunks, streams, promises, memoization, macros, and closures, turns out to be a few lines once you see the evaluation rules underneath. That's the real lesson. Languages aren't handed down from compiler writers. They're programs, and you can read, extend, and build them yourself.

Write one interpreter, and no language is magic again.
