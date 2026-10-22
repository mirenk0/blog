---
title: "Learning to See Edges"
date: 2024-07-21
tags:
  - writing
  - technology
  - programming
---

A convolutional neural network does what computer vision researchers used to do by hand, only better. For years, recognising images meant feature engineering: someone designed transformations that pulled out edges, corners, and textures, then fed those to a model. A CNN learns those transformations itself, from data. Under the hood it's still a small grid of numbers sliding across an image, which is exactly what the hand-designed features were.

## A kernel and a sliding window

A convolution takes a kernel, a small matrix usually 3×3, and lays it over a 3×3 patch of the image. It multiplies each kernel value by the pixel under it and sums the results into a single number. Then it slides one step and does it again, until it has covered the whole image. The output is a new grid called an activation map: a picture of where the image matched the kernel's pattern.

The right kernel makes that pattern an edge:

```python
top_edge  = tensor([[-1., -1., -1.],
                    [ 0.,  0.,  0.],
                    [ 1.,  1.,  1.]])

left_edge = tensor([[-1., 0., 1.],
                    [-1., 0., 1.],
                    [-1., 0., 1.]])
```

Over a flat region, the negative and positive weights cancel and the result is near zero, which shows as grey. Where dark pixels sit above light ones, the top-edge kernel produces a large positive number. Where the change runs the other way, it produces a large negative one. Turn the kernel ninety degrees and it finds left edges instead. Nobody has to tell a CNN to look for edges. Its first layer almost always learns kernels like these on its own.

## Padding and stride

Sliding a 3×3 kernel without crossing the border shrinks the output by a pixel on each side. Padding adds a ring of zeros around the image so the output keeps the same size as the input.

Stride is how far the kernel moves at each step. Stride 1 visits every position. Stride 2 skips every other one and halves the height and width of the output. That turns out to be a feature, not a loss.

## Stacking layers

In PyTorch, `F.conv2d` applies many kernels at once. It expects rank-4 tensors: the input as `(batch, in_channels, height, width)` and the kernels as `(out_channels, in_channels, kh, kw)`. The extra axis is for channels. A colour image is a rank-3 tensor with red, green, and blue channels, each one a 2D grid of pixel values. A single kernel has weights for every input channel, and it sums over all of them to produce one output channel.

A convolutional layer is the same equation as any other layer: multiply inputs by weights, sum, add a bias. The difference is that the same small set of weights is shared across every position in the image. That sharing is what makes CNNs efficient: an edge detector that works in one corner works everywhere.

A simple CNN is a stack of these layers with ReLU activations between them, ending in a flatten and a final layer that produces the class scores:

```python
def conv(ni, nf, act=True):
    layers = [nn.Conv2d(ni, nf, kernel_size=3, stride=2, padding=1)]
    if act: layers.append(nn.ReLU())
    return nn.Sequential(*layers)

model = nn.Sequential(
    conv(1, 8),    # 28x28 -> 14x14
    conv(8, 16),   # 14x14 -> 7x7
    conv(16, 32),  # 7x7   -> 4x4
    conv(32, 64),  # 4x4   -> 2x2
    conv(64, 10, act=False),  # 2x2 -> 1x1
    nn.Flatten(),
)
```

Each stride-2 layer halves the spatial size, so the number of channels is doubled to keep the amount of computation per layer roughly level. The image becomes smaller and deeper as it moves through the network. Stride-2 convolutions do the downsampling that separate pooling layers used to handle, with fewer moving parts.

Depth also widens what each activation can see. Its receptive field is the patch of the original image that feeds into it. In the first layer that's 3×3 pixels. Several stride-2 layers later, a single activation summarises most of the image, which is how simple edges get combined into textures, then parts, then objects.

## Keeping training stable

Deep stacks are fragile. Healthy training needs activations whose mean and standard deviation stay steady from layer to layer, and not too many of them stuck at zero. A ReLU that outputs zero passes no gradient back, and once enough of them die, the network stops learning. The quickest diagnostic is a plot of activation histograms over the course of training. A bright band at the bottom means most activations have collapsed to near zero. Then they partly recover and collapse again, and every collapse wastes training time. A smooth, spread-out distribution is what you want to see.

A few techniques help. Larger batches give more accurate gradients, so updates are less erratic. The 1cycle schedule changes the learning rate and momentum over the course of training. During warmup, the learning rate climbs from low to high while momentum drops. During annealing, the learning rate falls back down while momentum rises again. Starting gently avoids the early chaos that kills activations. That makes the high middle phase safe, and training at high learning rates tends to find solutions that generalise better.

The biggest fix is batch normalisation. After a layer, it normalises each channel's activations using the mean and standard deviation of the current batch. Then it applies two learnable parameters, gamma and beta, that scale and shift the result. The network gets well-behaved activations at every layer, while keeping the freedom to choose whatever scale actually works best. With batchnorm added to each convolutional layer, the same model trains faster, tolerates higher learning rates, and usually ends up more accurate, since the noise from batch statistics acts as a mild regulariser too.
