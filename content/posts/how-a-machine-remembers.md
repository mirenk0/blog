---
title: "How a Machine Remembers"
date: 2021-03-20
tags:
  - writing
  - technology
  - programming
---

Logic gates compute, but they can't remember. Feed them inputs and an answer comes out. Change the inputs and the old answer is gone. Memory needs one more ingredient, and that ingredient is time. Once a machine can tell one moment from the next, it can carry a value from one moment into the next, and everything a computer stores is built from that trick.

## Turning time into steps

Real time is continuous, and that's a problem for hardware. Electrical signals aren't instantaneous: voltages take a while to rise and fall, and while they're changing, the wires hold garbage. So the machine doesn't use real time. A clock, an oscillator ticking at a steady rate, chops time into discrete steps numbered one after another.

Each tick has a grey zone at the start, while the signals settle, and then a stretch where everything is stable and the result can be read. Only then does the machine move to the next step, where the same thing happens again. Discrete time is how the system guarantees it never acts on a half-finished value. It also handles speed: as long as the clock is slow enough for the slowest circuit to settle, nothing is asked to compute faster than it can.

## Combinational and sequential

This splits logic into two kinds. In combinational logic, the output at time *t* depends only on the input at time *t*. It's effectively instantaneous and has no memory at all.

In sequential logic, the output at time *t* depends on what happened at time *t−1*. New information never mixes with old in the same step. Each cycle reads the previous state, computes from it, and writes the next state. That's what makes state possible: a variable that changes every cycle based on what it was the cycle before.

## The flip-flop

The basic sequential element is the data flip-flop, or DFF. Its rule is simple: its output now is whatever its input was one tick ago. It holds a single bit across a single step of time. In circuit diagrams, a small triangle on a chip marks it as clocked: it depends on discrete time and it holds state.

A DFF can itself be built from NAND gates. Wire gates in a loop so that they feed back into each other and you get an unclocked latch. Put two of them in series, a so-called master-slave arrangement, and changes are isolated from one time step to the next. It's worth knowing this exists, but above this level the DFF can be treated as a primitive.

Every sequential chip has the same shape from then on: a row of DFFs holding the current state, and combinational logic between their outputs and their inputs that computes the next state from the current one. A counter is just DFFs plus an adder that adds one.

## A bit, then a word

A DFF remembers for one tick. To remember forever, put a multiplexer in front of it, with a `load` signal choosing between two inputs: the new `in` value, or the DFF's own output fed back around. With `load` set to 1, the bit takes the new value. With `load` at 0, it keeps passing its own value back to itself, cycle after cycle, until told otherwise. That's a 1-bit register, and it's a working memory.

Line up *w* of them, all sharing one `load` signal, and you have a register that holds a *w*-bit word. The width varies between machines, and 16 bits is plenty to build a complete computer.

## Random access

RAM is a sequence of *n* registers with addresses from 0 to *n−1*, and only one of them is selected at any moment. To pick one out of *n*, the address needs *k* = log₂ *n* bits: eight registers need three address bits. The word width *w* has nothing to do with the addressing. Width is how much a register holds, and the address is where that register sits.

Its behaviour is a few lines:

```c
// Let M be the state of the selected register
if (load) {
    M = in;
    // from the next cycle onwards:
    out = M;
} else {
    out = M;
}
```

To read register *i*, set `address = i`, and `out` emits its state. To write *v* to register *i*, set `address = i`, `in = v`, and `load = 1`. From the next cycle on, register *i* holds *v*.

Building one is less magic than it sounds. Feed `in` to every register at once, use a demultiplexer to route the `load` signal to only the addressed register, and use a multiplexer to pick which register's output reaches `out`. Bigger RAMs are built recursively: eight RAM8s and a 3-bit slice of the address make a RAM64, eight of those make a RAM512, and so on up.

It's called random access because the size doesn't matter. Whether it has eight registers or millions, any register can be reached in the same time as any other, just by setting its address.

## The program counter

One more sequential chip turns memory into a machine that runs programs. The program counter holds the address of the next instruction. Each cycle it does one of three things: it increments to move to the next instruction, it loads a new value to jump somewhere else, or it resets to zero to start over. That's every kind of control flow a computer has, reduced to a register and an adder.

## Where this leads

Every other kind of memory is a variation on the same idea, traded off against cost, speed, and power. RAM is volatile: cut the power and it forgets everything. ROM is not. It's read-only and keeps its contents without power, which is why it holds the code that boots the machine, initialises the hardware, and loads the operating system. Flash memory takes the best of both, readable and writable like RAM but persistent like ROM. Caches exploit the fact that a program touches some data far more than the rest: keep the hot data in a small, fast memory close to the processor and leave everything else in big, slow memory further away.

The logic underneath is the same in all of them: addressable registers, selected one at a time, each holding its state across the ticks of a clock.

A loop, a clock, and a choice between old and new: that's all memory is.
