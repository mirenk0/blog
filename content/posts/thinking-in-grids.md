---
title: "Thinking in Grids"
date: 2023-08-04
tags:
  - writing
  - technology
  - programming
---

A GPU isn't a faster CPU. It's a different kind of machine, and it's only fast at one kind of work: the same small operation repeated across huge amounts of independent data. Most programs don't look like that. Matrix arithmetic does, and that's why the GPU sits underneath all of modern machine learning. Programming one well means learning to see a problem as a grid.

## Host and device

A GPU program has two halves. The host is the CPU: it prepares the data, moves it into GPU memory, decides how the work will be split, and launches it. The device is the GPU: it runs a single function, the kernel, thousands of times at once, with each copy working on its own small piece of the data. The CPU sets up the conditions, and the GPU does the arithmetic.

## Grids, blocks, threads

The work is organised in a hierarchy. A launch creates a grid. The grid is divided into blocks, and each block is divided into threads. Both the blocks and the threads inside them can be laid out in two or three dimensions, so the whole thing looks like a big matrix of workers.

That shape is the point. Each thread knows its own coordinates, and it uses them to decide which element of the data it's responsible for. For a matrix, the mapping is natural: one thread per output cell.

Two numbers define a launch: threads per block (TPB) and blocks per grid (BPG). Threads per block has a hard ceiling set by the hardware, 1024 on current cards, and the best value depends on the architecture. Blocks per grid follows from it, since it's however many blocks it takes to cover the data.

## Shared memory and synchronisation

Threads in the same block can share a small, very fast scratchpad: shared memory. It's much quicker than the GPU's main memory, but it's tiny and only visible inside one block. Using it well is most of what makes GPU code fast.

The price is coordination. When threads cooperate through shared memory, one thread can't read a value until another has finished writing it. A barrier, `syncthreads`, makes every thread in the block wait until they've all reached the same point. Forget it and you get race conditions. Put it inside a branch that only some threads take and the block deadlocks. It's the same discipline as multithreaded CPU code, only with a thousand threads in step instead of four.

## Matrix multiplication, tiled

Numba lets you write CUDA kernels in Python. The `@cuda.jit` decorator compiles a function just in time for the GPU, and the launch configuration goes in square brackets before the arguments.

The naive kernel has each thread compute one cell of `C = A × B` by reading a full row of `A` and a full column of `B` from main memory. That works, but every element gets fetched over and over by different threads. The tiled version fixes this. Each block loads one square tile of `A` and one of `B` into shared memory, every thread in the block computes from those tiles, and then the block moves on to the next pair:

```python
from numba import cuda, float32
import numpy as np
import math

TPB = 32  # threads per block, in each dimension

@cuda.jit
def matmul_kernel(A, B, C):
    sA = cuda.shared.array(shape=(TPB, TPB), dtype=float32)
    sB = cuda.shared.array(shape=(TPB, TPB), dtype=float32)

    x, y = cuda.grid(2)  # this thread's column and row in C
    tx = cuda.threadIdx.x
    ty = cuda.threadIdx.y

    tmp = float32(0.0)
    for i in range(cuda.gridDim.x):
        # Each thread loads one element of each tile, or zero past the edge
        sA[ty, tx] = 0
        sB[ty, tx] = 0
        if y < A.shape[0] and tx + i * TPB < A.shape[1]:
            sA[ty, tx] = A[y, tx + i * TPB]
        if x < B.shape[1] and ty + i * TPB < B.shape[0]:
            sB[ty, tx] = B[ty + i * TPB, x]

        cuda.syncthreads()  # wait until the whole tile is loaded

        for j in range(TPB):
            tmp += sA[ty, j] * sB[j, tx]

        cuda.syncthreads()  # wait until everyone is done with this tile

    if y < C.shape[0] and x < C.shape[1]:
        C[y, x] = tmp
```

The bounds checks matter. When the matrix size isn't a multiple of the tile size, the edge blocks contain threads with nothing to do. They still have to load a zero and reach both barriers. If they returned early instead, the threads left behind would wait at `syncthreads` forever.

The host side copies the data over, sizes the grid, launches, and copies the result back:

```python
N = 1024
A = np.random.rand(N, N).astype(np.float32)
B = np.random.rand(N, N).astype(np.float32)

d_A = cuda.to_device(A)
d_B = cuda.to_device(B)
d_C = cuda.device_array((N, N), dtype=np.float32)

threads_per_block = (TPB, TPB)
blocks_per_grid = (math.ceil(N / TPB), math.ceil(N / TPB))

matmul_kernel[blocks_per_grid, threads_per_block](d_A, d_B, d_C)
C = d_C.copy_to_host()
```

When you time this, remember that the first launch includes compiling the kernel, and that launches are asynchronous. Warm up once, call `cuda.synchronize()` before stopping the clock, and only then compare against NumPy.

## Where this leads

The hard part of GPU programming isn't the syntax. It's the shape of the thinking. You stop writing a loop that walks through the data and start writing what a single cell does, trusting that a thousand copies of it will run at once. Then you arrange memory so those copies aren't fighting over the same slow bus, and you place barriers so they never get ahead of each other.

Problems that fit that shape get faster by orders of magnitude. Problems that don't belong on the CPU. Most of the skill is telling the two apart.

Don't loop over the data. Describe one cell, and let the grid do the rest.
