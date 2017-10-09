# Interactive Carbon Tax Calculator

This interactive shows how much revenue different levels of carbon taxes would produce and how much greenhouse gas emissions they would save over time. It is based on "a large-scale, computable general equilibrium (CGE) model of the US economy." For more information on the model itself, please see [the blog post introducing the calculator](http://www.rff.org/blog/2017/introducing-e3-carbon-tax-calculator-estimating-future-co2-emissions-and-revenues) by Marc Hafstead at Resources for the Future.

The calculator shows the effects of carbon taxes ranging from $5 to $50 per metric ton of CO&#8322; at annual growth rates ranging from zero to five percent above inflation. It has two sources of data: the projected revenue and the projected emissions reduction from each combination of base tax rate and percentage increase. The selected values are shown against a baseline of there being no carbon tax. Other values are calculated by the tool: cumulative emissions savings from 2018 to 2030, 10-year gross revenue (2018–2027), and comparison of annual emission to 1995 levels.

## The code

The graphs are made using D3 v4. It is fully responsive. The SVGs themselves are fluid with no set width (they take the width of the element containing them) so that they shrink at narrow screen sizes. The dev environment is ES6 JavaScript linted by jshint and compiled by Babel (via Grunt, with help from Browserify).

## License
Work for hire. Copyright is held by Resources for the Future ([more](http://www.rff.org/about/terms-and-conditions-use#copyright)).