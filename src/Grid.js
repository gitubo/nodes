// Grid.js
import { CONFIG } from './config.js';

export class Grid {
    static render(selection, width, height) {
        if (!CONFIG.grid.enabled) return;
        
        const spacing = CONFIG.grid.spacing;
        const radius = CONFIG.grid.dotRadius;
        const color = CONFIG.grid.dotColor;
        
        const dots = [];
        for (let x = 0; x <= width; x += spacing) {
            for (let y = 0; y <= height; y += spacing) {
                dots.push({ x, y });
            }
        }
        
        selection.selectAll("circle.grid-dot")
            .data(dots)
            .join(
                enter => enter.append("circle")
                    .attr("class", "grid-dot")
                    .attr("r", radius)
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y)
                    .attr("fill", color),
                update => update,
                exit => exit.remove()
            );
    }
}