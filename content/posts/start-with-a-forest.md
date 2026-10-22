---
title: "Start With a Forest"
date: 2024-07-14
tags:
  - writing
  - technology
  - programming
---

Deep learning dominates images, audio, and text, but for a table of data it's usually not the first thing to reach for. On most structured datasets an ensemble of decision trees gets results about as good as a neural network. It trains in a fraction of the time, needs no GPU, barely needs tuning, and, most importantly, tells you something about your data. Start with a random forest, and only reach for a neural network when it beats the forest on your validation set.

## Two kinds of column

Tabular modelling means predicting one column of a table from the others. Those columns come in two kinds. Continuous variables, like age or price, are numbers you can do arithmetic with. Categorical variables, like a product ID or a zip code, are discrete levels where adding or multiplying means nothing. Continuous values can go straight into a model. Categorical ones need converting to numbers first.

Neural networks handle categories with embeddings. Each level gets a learned vector, and similar levels end up close together. Mathematically, an embedding is a linear layer placed after a one-hot input, implemented as a cheap array lookup. It uses far less memory than one-hot encoding. More interestingly, it learns a distance between categories that often matches real-world intuition, with neighbouring regions or similar products landing near each other. That matters most for high-cardinality columns with thousands of levels, where other methods tend to overfit.

## How a tree learns

The simplest useful model is a single binary split: pick one column and one threshold, divide the rows into two groups, and predict each group's average. A decision tree just keeps doing that. Training is greedy:

1. For every column and every possible split point in it, divide the rows in two.
2. Score how well predicting each group's average target would do.
3. Keep the best split.
4. Repeat on each group until a stopping rule says enough.

For classification, a common score is Gini impurity: the chance that two items drawn at random from the same group belong to different classes. A pure group scores zero.

Trees need no embeddings and no one-hot encoding. A split can isolate one unusual category as easily as a threshold on a number. Left unchecked, though, a tree memorises. Keep splitting and you end up with roughly one leaf per training row, a training error of zero, and poor results on validation. A rule like `min_samples_leaf=25` stops the splitting while each leaf still holds enough rows to mean something.

## Preparing the table

Most of the work happens before the model. Dates should be broken into parts like year, month, day of the week, and days elapsed, so the model can split on what actually matters about a date. String columns become category codes. Where a category has a natural order, such as product sizes from compact to large, give the codes that order rather than an arbitrary one. Missing values get filled, typically with the median, alongside a new true/false column that records where data was missing, because missingness is often informative in itself.

The validation set has to mirror how the model will be used. If the model will predict the future, validate on the latest period and train on everything before it. A random split would let it peek at the future.

## Many trees, randomly

Leo Breiman's insight was bagging. Train many models, each on a random sample of the rows, and average their predictions. Each model makes errors, but because they've seen different data, their errors are largely uncorrelated, and averaging cancels much of them out. A random forest adds one more source of randomness: each split only considers a random subset of the columns.

```python
from sklearn.ensemble import RandomForestRegressor

m = RandomForestRegressor(
    n_estimators=40,       # number of trees
    max_samples=200_000,   # rows sampled per tree
    max_features=0.5,      # share of columns tried at each split
    min_samples_leaf=5,
    oob_score=True,
    n_jobs=-1,
)
m.fit(xs, y)
```

Forests are forgiving. Adding trees improves accuracy and never makes them overfit, and settings like `max_features=0.5` with a small `min_samples_leaf` work well almost everywhere. They also come with a free validation estimate. Every row was left out of some trees' samples, so you can score each row using only the trees that never saw it. That out-of-bag error is especially handy when data is too scarce to set much aside.

## Asking the forest questions

This is where forests earn their place at the start of a project:

- **Confidence.** The spread of predictions across individual trees shows how sure the forest is about a given row.
- **Feature importance.** Total improvement from each column's splits, across all trees, ranks the predictors. Dropping low-importance columns usually costs nothing and leaves a simpler model.
- **Redundancy.** Rank correlation finds near-duplicate columns. Keep one of each pair.
- **Partial dependence.** Vary a single column while holding the others fixed, and plot how predictions respond. On used bulldozer auctions, for example, price climbs steeply with year of manufacture after 1990.
- **Single predictions.** A tree interpreter breaks one prediction into each column's positive or negative contribution, which is shown as a waterfall chart. That's exactly what you need to explain a decision in production.

These tools also catch data leakage: information about the target that wouldn't exist at prediction time. In one well-known grant dataset, applications processed on odd dates such as Sundays or New Year's Day were almost always accepted, because those dates were only filled in after approval. The warning signs are accuracy that looks too good, top predictors that make no practical sense, and partial dependence plots that defy logic. Building a quick model early is the fastest way to find them.

A forest can even check whether your validation data looks like your training data. Label every row by which set it came from and train a model to predict that label. Columns that predict it well, such as IDs or elapsed time, are the ones that have drifted, and often you can remove them without losing accuracy.

## Where trees run out

A forest predicts by averaging training values, so it can never predict outside their range. Ask it about next year in a market with steady inflation and it will come in low, every time. Neural networks extrapolate better. They need the same data preparation plus normalised continuous inputs, they train more slowly, and they're more sensitive to hyperparameters.

The two also combine well. Averaging a forest with a neural network often beats either alone, for the same reason bagging works: their errors differ. Boosting is a different kind of ensemble. Trees are added one after another, each fitting the errors the ensemble has left so far. Gradient boosting machines are often the most accurate of the three, but unlike forests they can overfit as trees are added, and they need careful tuning.

The neatest trick crosses the boundary entirely. Train a neural network, take its learned category embeddings, and feed them as input features to a random forest or nearest-neighbours model. Those models improve dramatically, and at inference time there's no network to run, just an array lookup. The embeddings can be shared across every model in the organisation.

So the order of work is clear. Fit a forest first, for a fast baseline and an understanding of the data. Try gradient boosting and a neural network next, and keep them only if they clearly win on validation in reasonable time. If the trees are doing well, give them embeddings for the categorical columns and see how much further they go.
