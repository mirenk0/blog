---
title: "Programs That Learn"
date: 2023-07-03
tags:
  - writing
  - technology
  - programming
---

Deep learning isn't reserved for mathematicians with PhDs and giant datasets. It's mostly addition and multiplication, done an enormous number of times, plus a loop that nudges numbers in the right direction. People from all kinds of backgrounds have pushed the field forward, and it can be pointed at almost any domain to produce state-of-the-art results. The way in is to practise, not to study the theory first.

## A long road to the bird

The idea is older than it looks. In the 1940s a neurophysiologist and a young self-taught logician sketched a mathematical model of the neuron, and in 1958 Frank Rosenblatt built a machine on it, the perceptron. What followed was decades of promise and disappointment, real breakthroughs in the 1990s, and then a sudden turn. As late as the mid-2010s, asking a computer whether a photo contained a bird was treated as a joke about impossible projects. A few years later it was a homework exercise.

## Learning instead of writing

An ordinary program is a list of steps someone wrote by hand: input goes in, the program runs, output comes out. Machine learning swaps the hand-written steps for a model with a second set of inputs, its weights, now usually called parameters. The same input with different weights produces different behaviour.

Training is the search for good weights. The model makes predictions, and something scores them. The weights get adjusted towards whatever scored better, and the loop runs again, many times over. When training is done, the weights are fixed and baked in. The result is just a program like any other. It takes inputs, returns outputs, and can be plugged into other programs.

That's the whole idea, and the vocabulary is worth getting right. The functional form of the model is its *architecture*. A model is an architecture plus one particular set of parameters. The data it learns from is the *independent variable*, and the answers it's meant to give, "dog" or "cat", are the *labels*, also called targets or the dependent variable. The model's outputs are *predictions*. The *loss* scores those predictions against the labels, and it's what drives training. A *metric* also measures how good the model is, but it's chosen for humans to read, like accuracy. One pass through all the training data is an *epoch*.

## Neural networks

A neural network is one particular architecture, and an unusually flexible one. It multiplies its inputs by weights, adds them up, replaces negative values with zero, and repeats that across many layers. The universal approximation theorem says that, given enough units, such a network can approximate any continuous function as closely as you like, in theory. In practice the hard part is finding the right weights, and a general method does that automatically: stochastic gradient descent. It measures how the loss would change if each weight moved slightly, and moves every weight a little in the direction that lowers it.

That arithmetic is why GPUs matter. Training feeds the model batches of examples at once, and a GPU can do thousands of these multiply-adds in parallel where a CPU does a handful.

Most problems come in two flavours. Classification predicts a category: is this a cat or a dog? Regression predicts a number: how old is this cat? For regression with a known range, such as film ratings from 0.5 to 5, it helps to clamp the model's output to that range.

## Standing on someone else's training

You rarely train from scratch. A pretrained model has already learned general features from a huge dataset, and fine-tuning adapts it to your task with a little more training on your data. This is transfer learning. It's the most effective way to get good results quickly, and research underrated it for a long time.

Within each field, from computer vision to language to tabular data, the methods differ, and so do the subtasks: classifying an image is not the same job as segmenting it into regions. Images are usually shrunk, by cropping or squashing, to a small fixed size like 224×224. Bigger images can carry more detail, but they cost far more memory and time, and small ones train much faster. Tabular data has far fewer pretrained models, so there you often train from scratch.

Vision models are also more general than they look. Sounds, time series, and other signals can be turned into images, and a vision model trained on them often beats purpose-built methods. It feels like a hack, but it works because the network only ever sees numbers arranged in a grid.

## What a model can't do

A model needs data, and it can only learn patterns that are in that data. It produces predictions, not decisions about what to do with them. Most of all, it needs labels. When a company says it needs more data, it usually means more labelled data.

Models can also feed on themselves. A predictive policing model sends officers to the neighbourhoods with the most recorded arrests. More officers record more arrests there, and the next round of training makes the model more certain. Recommendation systems do the same thing: the videos that get watched get recommended, which gets them watched more. The heaviest viewers of extreme or conspiratorial content end up steering what everyone else is shown.

## Holding data back

The central risk in training is overfitting: the model memorises the training examples instead of learning general lessons, and then fails on anything new. The defence is to hold data back. The training set is what the model learns from. The validation set is held out and only used to measure how well the model does.

Even that isn't enough, because you tune the hyperparameters by watching validation scores. Those are the settings you choose rather than the model learns, like how many epochs to run or how fast the weights should move. Make enough of those choices and you overfit the validation set too. So there's a third tier, the test set, which stays completely hidden until the very end. Training data is fully exposed, validation data partly, and test data not at all. It's worth keeping one even when you're evaluating someone else's model, so you can judge it with your own data and your own metric.

How you split matters as much as whether you split. For time series, a random split lets the model peek at the future. Train on the earlier period and validate on the later one, because that's the situation the model will face in production. Quant funds call this back-testing: fit a model on data up to some date, then check whether it would have predicted what happened afterwards.

Working practice follows from the same concern for honest results. Prototype on a small subset before committing to the full dataset. And in a notebook, where each cell keeps its own state, run the cells in order, or you'll end up with results you can't reproduce.
