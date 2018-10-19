import numpy as np
import matplotlib.pyplot as p


def plot(curve, title):
    x = np.linspace(-1, 1, len(curve))

    p.grid()
    p.title(title)
    p.xlabel("input")
    p.ylabel("output")
    p.ylim(-1.1, 1.1)
    p.plot(x, curve)
    p.show()


def some_curve(cycle, size=255):
    curve = np.empty(size)

    size_sub_1 = size - 1
    cycle_pi = 4 * cycle * np.pi
    for i in range(size):
        x = (i / size_sub_1 - 0.5) * cycle_pi
        curve[i] = 0 if x == 0 else (1 - np.cos(x)) / x

    return curve


plot([0, 0, 1], "Half-Wave Rectification")
plot([1, 0, 1], "Full-Wave Rectification")
plot(some_curve(4), "(1 - cos(x)) / x")
