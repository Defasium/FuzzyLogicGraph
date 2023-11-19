var pyodide;

(async function (){
    pyodide = await loadPyodide();
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    //await micropip.install('setuptools');
    await micropip.install('numpy');
    await micropip.install('pandas');
    /*
    await micropip.install(
        'https://www.piwheels.org/simple/docopt/docopt-0.6.1-py3-none-any.whl'
    );
    await micropip.install('pymorphy2');
    */

    pyodide.runPython(`
    import numpy as np
    import pandas as pd
    import json
    from functools import reduce

    class FuzzySet:
        def __init__(self, x, mu_x, norm_mu=False):
            if norm_mu:
                mu_x = (mu_x - np.min(mu_x)) / (np.max(mu_x) - np.min(mu_x))

            if np.max(mu_x) > 1 or np.max(mu_x) < 0:
                raise ValueError('mu function is between 0 and 1 only!')

            argsort = np.argsort(x)
            self.x = x[argsort].copy()
            self.mu_x = mu_x[argsort].copy()


        @classmethod
        def _join_two(cls, self, other):
            obj1 = pd.DataFrame(dict(x=self.x, mu1=self.mu_x))
            obj2 = pd.DataFrame(dict(x=other.x, mu2=other.mu_x))

            return obj1.merge(obj2, on='x', how='outer').fillna(0)


        def __repr__(self): # str
            # obj = pd.DataFrame(dict(x=self.x, mu=self.mu_x))
            # return str(obj)
            return json.dumps(
                dict(
                    x=list(map(float, self.x)),
                    mu=list(map(float, self.mu_x))
                )
            )


        def __eq__(self, other): # ==
            obj = FuzzySet._join_two(self, other)
            #print(obj)
            return (obj.mu1 == obj.mu2).all()


        def __invert__(self): # ~
            return FuzzySet(self.x, 1 - self.mu_x)


        def __or__(self, other): # |
            obj = FuzzySet._join_two(self, other)
            return FuzzySet(obj.x.values, np.maximum(obj.mu1, obj.mu2).values)


        def __and__(self, other): # &
            obj = FuzzySet._join_two(self, other)
            return FuzzySet(obj.x.values, np.minimum(obj.mu1, obj.mu2).values)


        def __truediv__(self, other): # /
            return self & (~other)


        def __xor__(self, other): # ^
            return (self & (~other)) | ((~self) & other)


        def __add__(self, other):
            obj = FuzzySet._join_two(self, other)
            return FuzzySet(obj.x, (obj.mu1 + obj.mu2 - obj.mu1 * obj.mu2).values)


        def __mul__(self, other):
            if isinstance(other, float) or isinstance(other, int):
                assert (other > 0), 'Only positive values are allowed'
                assert np.max(self.mu_x * other) <= 1, 'Not valid operation'
                return FuzzySet(self.x, self.mu_x * other)
            obj = FuzzySet._join_two(self, other)
            return FuzzySet(obj.x, (obj.mu1 * obj.mu2).values)

        __rmul__ = __mul__

    `);
    console.log(pyodide.globals.get('np'));
    console.log(pyodide.globals.get('FuzzySet'));
    pyodide.runPython(`
    x = json.dumps(list(map(float, np.linspace(0, 1, 1000))))
    `);
    console.log(JSON.parse(pyodide.globals.get('x')));

    document.getElementsByTagName('img')[0].remove();
    calcAndDrawFuzzy();
})();


function calcAndDrawFuzzy(inp = 'C = A + B') {
    console.log(inp);

    pyodide.runPython(`
    H = FuzzySet(np.arange(0, 1000), np.arange(1000)*0)
    try:
        del A
        del B
        del C
    except:
        pass
    `);

    //console.log(pyodide.globals.get('H'));

    if (switchElem.checked) {
        pyodide.runPython(`
        As = [
            FuzzySet(np.arange(0, 1000), np.sin(np.arange(1000)/175)**2),
        ]

        A = reduce(lambda x, y: x | y, As, H)

        Bs = [
            FuzzySet(np.arange(1000), np.linspace(0, 1, 1000)),
        ]
        B = reduce(lambda x, y: x | y, Bs, H)
        `);
    } else {
        pyodide.runPython(`
        As = [
            FuzzySet(np.arange(0, 500), np.linspace(1, 0, 500)),
            FuzzySet(np.arange(500, 800), np.linspace(0, 0.5, 300)),
            FuzzySet(np.arange(800, 1000), np.linspace(0, 1, 200)*0 + 0.),
        ]
        A = reduce(lambda x, y: x | y, As)

        Bs = [
            FuzzySet(np.arange(0, 200), np.linspace(0, 1, 200)*0),
            FuzzySet(np.arange(200, 400), np.linspace(0, 1, 200)*0 + 0.2),
            FuzzySet(np.arange(400, 600), np.linspace(0, 1, 200)*0 + 0.4),
            FuzzySet(np.arange(600, 800), np.linspace(0, 1, 200)*0 + 0.),
            FuzzySet(np.arange(800, 1000), np.linspace(0, 1, 200)*0 + 0.8),
        ]
        B = reduce(lambda x, y: x | y, Bs)
        `);
    };

    //console.log(pyodide.globals.get('B'));

    pyodide.runPython(`${inp}`);
    console.log(pyodide.globals.get('C'));

    pyodide.runPython(`
    A_dat = str(A)
    B_dat = str(B)
    C_dat = str(C)
    `);

    dataA = JSON.parse(pyodide.globals.get('A_dat'));
    dataB = JSON.parse(pyodide.globals.get('B_dat'));
    dataC = JSON.parse(pyodide.globals.get('C_dat'));
    console.log(dataC);

    var trace1 = {
      x: dataA.x,
      y: dataA.mu,
      //text: arrs[1].map(e=>`${e}`),
      name: 'A',
      opacity: 0.5,
      //type: 'bar',
      line: {
        dash: 'dot',
        color: 'black',
        width: 3
      }
    };
    var trace2 = {
      x: dataB.x,
      y: dataB.mu,
      //text: arrs[1].map(e=>`${e}`),
      name: 'B',
      opacity: 0.5,
      //type: 'bar',
      line: {
        color: 'red',
        width: 3
      }
    };
    var trace3 = {
      x: dataC.x,
      y: dataC.mu,
      //text: arrs[1].map(e=>`${e}`),
      name: 'C = f(A, B)',
      
      //type: 'bar',
      line: {
        color: 'green',
        width: 6
      }
    };

    var data = [trace3, trace1, trace2, ];

    var layout = {
      title: 'Нечёткая логика',
      height: 400,
      width: 800,
      xaxis: {
        title: 'x',
        tickangle: 0
      },
      yaxis: {
        title: 'μ(x)'
      }
    };

    Plotly.newPlot('chart', data, layout);
};
