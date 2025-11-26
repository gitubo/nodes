// Grid.js
import { CONFIG } from './config.js';

export class Grid {
    static render(selection, width, height) { // width/height ignored for pattern
        const defs = selection.select("defs").empty() ? selection.append("defs") : selection.select("defs");
        
        defs.append("pattern")
            .attr("id", "grid-pattern")
            .attr("width", CONFIG.grid.spacing)
            .attr("height", CONFIG.grid.spacing)
            .attr("patternUnits", "userSpaceOnUse")
            .append("circle")
            .attr("cx", CONFIG.grid.dotRadius)
            .attr("cy", CONFIG.grid.dotRadius)
            .attr("r", CONFIG.grid.dotRadius)
            .attr("fill", CONFIG.grid.dotColor);

        selection.append("rect")
            .attr("width", "100%") // Fills the infinite canvas
            .attr("height", "100%")
            .attr("fill", "url(#grid-pattern)");
    }
}