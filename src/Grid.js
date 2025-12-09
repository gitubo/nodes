// src/Grid.js
import { CONFIG } from './config.js';

export class Grid {
    static render(selection, size = 50000) { 
        const defs = selection.select("defs").empty() ? 
            selection.append("defs") : selection.select("defs");
        
        // Define the pattern (unchanged logic)
        const pattern = defs.select("#grid-pattern");
        if (pattern.empty()) {
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
        }

        // Clean up old rects if re-rendering
        selection.selectAll("rect").remove();

        // Draw Infinite Rect
        // We draw a huge rectangle centered at (0,0)
        // This moves with the viewport group, creating the illusion of infinite space
        selection.append("rect")
            .attr("x", -size)
            .attr("y", -size)
            .attr("width", size * 2)
            .attr("height", size * 2)
            .attr("fill", "url(#grid-pattern)");
    }
}