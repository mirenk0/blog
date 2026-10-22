---
title: "Bytes All the Way Down"
date: 2022-02-01
tags:
  - writing
  - technology
  - programming
---

C hides almost nothing. Memory is one long array of bytes, a variable is a name for a position in it, and every convenience a higher-level language gives you, from strings to lists to garbage collection, is something you could build yourself out of those bytes. Learning C is mostly learning what those conveniences cost.

## Compiled, typed, explicit

Python reads a file top to bottom and runs it line by line. C compiles the whole program first and starts at a function called `main`, which returns an `int`: the exit status, where 0 means success and anything else means failure.

```c
#include <stdio.h>

int main() {
    printf("hello\n");
    return 0;
}
```

Compilation buys speed, catches a class of errors before the program ever runs, and produces a binary that doesn't need the language installed to run. It catches some problems, not all of them. The costs are waiting for builds and losing the ability to run half a program while the other half is broken.

Types are fixed. A variable can change its value but never its type, and `const` stops even the value from changing. Functions declare the types of their parameters and their return value, and `void` stands in for "nothing", whether that's no return value or no parameters. There's no string interpolation either: `printf` takes format specifiers like `%d` for integers, `%f` for floats, `%c` for characters, `%s` for strings, `%p` for addresses, and `%zu` for sizes.

Code is split across files. Header files (`.h`) declare types and function signatures, and `.c` files implement them. A file that wants to use them does `#include "thing.h"`. Including the same header twice redefines everything in it and breaks the build, so headers guard themselves, either with `#pragma once` at the top or with the older `#ifndef THING_H / #define THING_H / #endif` pattern. Both work. `#pragma once` is harder to get wrong.

## Data has a size

Every type occupies a fixed number of bytes, and the standard guarantees less than people assume. A `char` is always 1 byte. A `float` is usually 4 bytes and a `double` usually 8. An `int` is 4 bytes on almost every modern desktop, 32-bit or 64-bit. What usually changes between architectures is `long` and the size of pointers. The only reliable answer is to ask the compiler. `sizeof` is an operator, not a function, and it returns a `size_t`, an unsigned type big enough to describe the largest object the machine can address. When you need an exact width, `<stdint.h>` provides types like `uint8_t` and `uint32_t`, where the number is the bit count.

Structs group related fields into one value. They're how C returns several values at once and how it keeps function signatures readable:

```c
typedef struct {
    char *name;
    int lat;
    int lon;
} city_t;

city_t c = { .name = "San Francisco", .lat = 37, .lon = -122 };
```

Designated initializers like these are the best of the three ways to build a struct. They're readable, and reordering fields doesn't silently break them. `= {0}` zeroes everything, and positional initializers depend on field order. `typedef` saves writing `struct City` everywhere, and the `_t` suffix is the usual convention for type names.

Fields sit in memory one after another, in the order you declare them, but not always packed tightly. CPUs prefer data aligned to its own size, so the compiler inserts padding. A struct holding a `char`, then an `int`, then a `double` takes 16 bytes, not 13. That's why `sizeof` on a struct can exceed the sum of its fields. Since you control the order, you control the padding. Sorting fields from largest to smallest usually minimises it.

## Addresses

A variable is a human-readable name for an index into that big array of bytes. The `&` operator gives you the index, and it's just a number, conventionally printed in hexadecimal:

```c
int age = 37;
printf("%p\n", &age);   // 0x7ffd5e8c3a4c
```

That number isn't a location in physical RAM. Unless you're writing firmware for bare metal, your program runs as a process inside an operating system that gives it virtual memory: its own private address space that looks like physical memory but is mapped onto it by the OS. That gives isolation, since one process can't read another's memory, and freedom for the OS to move data around, even out to disk, behind your back.

A pointer is a variable that stores an address. `*` declares one, and the same symbol dereferences it, following the address to the value:

```c
int meaning = 42;
int *p = &meaning;   // p holds the address of meaning
int value = *p;      // value is 42
```

C passes everything by value. Hand a struct to a function, update a field, and the caller's struct is untouched, because the function worked on a copy. To modify the original, pass a pointer to it. For pointers to structs, `p->x` is shorthand for `(*p).x`, with the parentheses needed because `.` binds tighter than `*`.

## Arrays and strings

An array is a fixed number of same-typed elements laid out contiguously. In most expressions, its name decays to a pointer to its first element, which is why indexing and pointer arithmetic are interchangeable:

```c
int numbers[5] = {1, 2, 3, 4, 5};
numbers[2];        // 3
*(numbers + 2);    // 3, the same thing
```

Adding 2 to an `int *` moves it forward by two `int`s, not two bytes. The compiler scales by the element size, so the same arithmetic walks an array of structs one struct at a time. Arrays also decay when passed to functions, so a function can modify the caller's array, but it can't ask how long the array is. Inside the function, `sizeof` just reports the size of a pointer. And nothing stops you walking off the end. C has no bounds checks, so the length has to travel alongside the pointer.

C has no string type. A string is an array of `char` ending in a null terminator, `'\0'`, and a `char *` points at its first character. Its length isn't stored anywhere: `strlen` counts until it finds the terminator, so a missing terminator or a buffer one byte too small is a classic source of bugs. `<string.h>` supplies the basics, such as `strcpy`, `strcat`, `strcmp`, `strchr`, and `strstr`. The `strn` variants take a maximum length, but they don't always null-terminate for you. Writing `strcat` yourself shows how little is going on:

```c
void concat(char *dest, const char *src) {
    while (*dest != '\0') dest++;   // find the end of dest
    while (*src != '\0') {
        *dest++ = *src++;           // copy one character at a time
    }
    *dest = '\0';
}
```

It trusts that `dest` has room. If it doesn't, it writes past the end of the buffer into whatever comes next.

## Stack and heap

Memory comes in two regions. The stack holds local variables. Each function call pushes a frame holding the return address, copies of the arguments, and the locals. Returning pops the frame. Allocating on the stack is just moving a pointer, which makes it fast and cache-friendly. It cleans up automatically and is private to each thread. That speed is why Go's compiler works hard, through escape analysis, to keep variables on the stack, while Python puts everything on the heap.

The stack is also small. Recurse deeply enough and the frames run out of room, and the OS kills the program with a segmentation fault: a stack overflow. And because frames are constantly reused, a pointer into one is only valid while that function is running. Never return the address of a local variable.

The heap is for data that has to outlive the function that created it, or whose size isn't known until runtime. `malloc` asks for a number of bytes and returns a pointer to uninitialised memory, or `NULL` if it fails. `calloc` returns zeroed memory. `realloc` resizes an allocation, possibly moving it. Then the memory is yours until you give it back:

```c
int *arr = malloc(n * sizeof(int));
if (arr == NULL) {
    return NULL;
}
// ... use arr ...
free(arr);
arr = NULL;
```

`free` doesn't erase anything or change your pointer. It just hands the memory back to the allocator for reuse. A pointer that still holds the old address is dangling, and using it is undefined behaviour. Forgetting to free is a leak: the memory stays reserved, doing nothing, until the process exits. A leak inside a loop grows until something crashes. Manual management is tedious, and it's the main reason C programs are both fast and fragile.

## Generic code with void

`void *` is a pointer to anything. It can hold any address, but it can't be dereferenced until you cast it back to a real type, and since the type is gone, so is the size. That's enough to write generic code, as long as the size travels separately:

```c
void swap(void *a, void *b, size_t size) {
    void *tmp = malloc(size);
    if (tmp == NULL) return;
    memcpy(tmp, a, size);
    memcpy(a, b, size);
    memcpy(b, tmp, size);
    free(tmp);
}
```

The same idea gives you a growable stack of arbitrary pointers. Its storage is a `void **`, a pointer to an array of pointers, which doubles in size whenever it fills up:

```c
typedef struct {
    size_t count;
    size_t capacity;
    void **data;
} stack_t;

void stack_push(stack_t *s, void *obj) {
    if (s->count == s->capacity) {
        size_t new_cap = s->capacity ? s->capacity * 2 : 8;
        void **grown = realloc(s->data, new_cap * sizeof(void *));
        if (grown == NULL) return;   // the old data is still valid
        s->data = grown;
        s->capacity = new_cap;
    }
    s->data[s->count++] = obj;
}
```

C doesn't care whether those pointers lead to ints, floats, or strings. It's bytes all the way down. To keep track of what's what, pair the data with a tag. An `enum` names a set of integer constants, and pairs naturally with `switch`, where modern compilers will warn about a case you forgot to handle. Remember the `break`, or execution falls through into the next case. A `union` holds exactly one of several types in the same memory, sized to fit the largest, and you may only read the member you last wrote. Put them together and you have a tagged union, the shape of every value in a dynamic language:

```c
typedef enum { INTEGER, FLOAT, STRING, ARRAY } object_kind_t;

typedef struct Object object_t;

typedef struct {
    size_t size;
    object_t **elements;
} array_t;

struct Object {
    object_kind_t kind;
    union {
        int v_int;
        float v_float;
        char *v_string;
        array_t v_array;
    } data;
};
```

The forward declaration `typedef struct Object object_t;` lets the struct mention pointers to its own type before its definition is complete. Linked lists, trees, and pairs of structs that point at each other all rely on the same trick.

Constructors allocate the object and then fill in the tag and the payload. A string has to copy its characters into memory of its own, because the caller's buffer might not live as long as the object:

```c
object_t *new_string(const char *value) {
    object_t *obj = malloc(sizeof(object_t));
    if (obj == NULL) return NULL;

    char *copy = malloc(strlen(value) + 1);   // + 1 for the '\0'
    if (copy == NULL) {
        free(obj);
        return NULL;
    }
    strcpy(copy, value);

    obj->kind = STRING;
    obj->data.v_string = copy;
    return obj;
}
```

From there, operations dispatch on the tag. `length` returns 1 for numbers, `strlen` for strings, and the size for arrays. `add` sums two numbers, promoting to float when needed, concatenates two strings into a fresh allocation, and joins two arrays into a new one. That's exactly how `+` can mean different things in Python.

## Building a garbage collector

Once objects can contain other objects, someone has to decide when to free them. A garbage collector does that automatically while the program runs. It's a huge productivity win, paid for with runtime work that never makes the program itself any faster. Rust takes a third route, proving at compile time when each value's lifetime ends, so it needs neither a collector nor manual `free`.

The simplest collector is reference counting. Every object carries a hidden counter. Storing a reference increments it, dropping one decrements it, and when it hits zero the object is freed, which decrements everything it referenced in turn. It's easy to build and frees memory promptly. But every pointer assignment now does bookkeeping, which has to be atomic once threads are involved. And it can't handle cycles. Put array A inside array B and B inside A, and their counts never reach zero, even after the rest of the program has forgotten both.

Mark and sweep, invented by John McCarthy for Lisp, solves cycles by not counting at all. It starts from the roots, the objects referenced directly from live stack frames, and marks everything reachable from them. Then it sweeps through every allocated object and frees whatever wasn't marked:

```c
void mark(vm_t *vm) {
    for (size_t i = 0; i < vm->frames->count; i++) {
        frame_t *frame = vm->frames->data[i];
        for (size_t j = 0; j < frame->references->count; j++) {
            object_t *obj = frame->references->data[j];
            obj->is_marked = true;
        }
    }
}
```

That marks only the roots. Tracing finishes the mark phase: it walks into container objects such as arrays and marks everything they hold, recursively, until nothing new is found. A cycle that nothing on the stack can reach is never marked, so it gets swept like any other garbage.

The price is complexity and unpredictability. Real collectors use far more sophisticated ways of finding roots, carry extra memory overhead, and may pause the whole program to sweep when there's a lot to free. Every language with a garbage collector made some version of this trade, and C is where you can watch it being made.
