function pickStep( steps ) {
    // TODO
}
function pickNode( nodes ) {
    // TODO
}
function plotWithNodesAndSteps( plot, nodes, steps ) {
    return { nodes: nodes, steps: steps };
}
function makeStep( start, stop ) {
    return { type: "step", name: gensym(), start: start, stop: stop };
}
function stepsEq( a, b ) {
    return a.name === b.name;
}

addPlotDevelopment( function ( plot ) {
    // Add a beat to any step.
    
    var step = pickStep( plot.steps );
    if ( step === null )
        return plot;
    var node = { type: "doNothing", name: gensym() };
    return plotWithNodesAndSteps( plot,
        plot.nodes.plusEntry( node.name, node ),
        plot.steps.minusTruth( step ).
            plusTruth( makeStep( step.start, node.name ) ).
            plusTruth( makeStep( node.name, stop: step.stop ) ) );
} );
addPlotDevelopment( function ( plot ) {
    // Add a fresh puzzle dependency to any step by foreshadowing it and lampshading it all at once.
    
    var step = pickStep( plot.steps );
    if ( step === null )
        return plot;
    var resource = gensym();
    var foreshadow = { type: "foreshadow", name: gensym(), resource: resource, bookend: null };
    var lampshade = { type: "lampshade", name: gensym(), resource: resource, bookend: null };
    return plotWithNodesAndSteps( plot,
        plot.nodes.plusEntry( node.name, node ),
        plot.steps.minusTruth( step ).
            plusTruth( makeStep( step.start, foreshadow.name ) ).
            plusTruth( makeStep( foreshadow.name, lampshade.name ) ).
            plusTruth( makeStep( lampshade.name, step.stop ) ) );
} );
addPlotDevelopment( function ( plot ) {
    // Add a non-consuming use to any foreshadowing.
    
    var step = pickStep( plot.steps );
    if ( step === null )
        return plot;
    var foreshadowing = plot.get( step.start );
    if ( foreshadowing.type !== "foreshadow" )
        return plot;
    
    var node = { type: "use", name: gensym(), resource: foreshadowing.resource };
    return plotWithNodesAndSteps( plot,
        plot.nodes.plusEntry( node.name, node ),
        plot.steps.minusTruth( step ).
            plusTruth( makeStep( step.start, node.name ) ).
            plusTruth( makeStep( node.name, step.stop ) ) );
} );
addPlotDevelopment( function ( plot ) {
    // Migrate a foreshadowing earlier in time, as long as it doesn't go earlier than its bookend (if any). If it crosses a choice boundary, add a corresponding lampshading on the other branch.
    
    var step = pickStep( plot.steps );
    if ( step === null )
        return plot;
    var foreshadowing = plot.get( step.stop );
    if ( foreshadowing.type !== "foreshadow" )
        return plot;
    var otherNode = plot.get( step.start );
    
    if ( (otherNode.type === "foreshadow"
            || otherNode.type === "lampshade")
        && ((otherNode.bookend !== null
                && otherNode.bookend.val === foreshadowing.resource)
            || (foreshadowing.bookend !== null
                && foreshadowing.bookend.val === otherNode.resource)) )
        return plot;
    
    if ( otherNode.type === "doNothing"
        || otherNode.type === "foreshadow"
        || otherNode.type === "lampshade"
        || otherNode.type === "use"
        || otherNode.type === "startConcurrent"
        || otherNode.type === "stopConcurrent"
        || otherNode.type === "startChoice"
        || otherNode.type === "stopChoice" ) {
        
        var newNodes = plot.nodes.minusEntry( foreshadowing.name, foreshadowing );
        var newSteps = plot.steps.minusTruth( step );
        plot.steps.each( function ( name, nextStep ) {
            if ( nextStep.start !== foreshadowing.name )
                return;
            newSteps = newSteps.minusTruth( nextStep ).
                plusTruth( makeStep( otherNode.name, nextStep.stop ) );
        } );
        plot.steps.each( function ( name, nextStep ) {
            if ( nextStep.start !== otherNode.name )
                return;
            if ( stepsEq( step, nextStep ) )
                return;
            if ( otherNode.type !== "startChoice" )
                return;
            var lampshading = { type: "lampshade", name: gensym(), resource: foreshadowing.resource, bookend: null };
            newNodes = newNodes.plusEntry( lampshading.name, lampshading );
            newSteps = newSteps.minusTruth( nextStep ).
                plusTruth( makeStep( nextStep.start, lampshading.name ) ).
                plusTruth( makeStep( lampshading.name, nextStep.stop ) );
        } );
        plot.steps.each( function ( name, prevStep ) {
            if ( prevStep.stop !== otherNode.name )
                return;
            var newForeshadowing = { type: "foreshadow", name: gensym(), resource: foreshadowing.resource, bookend: foreshadowing.bookend };
            newNodes = newNodes.plusEntry( newForeshadowing.name, newForeshadowing );
            newSteps = newSteps.minusTruth( prevStep ).
                plusTruth( makeStep( prevStep.start, newForeshadowing.name ) ).
                plusTruth( makeStep( newForeshadowing.name, prevStep.stop ) );
        } );
    } else if ( otherNode.type === "startStory" ) {
        return plot;
    } else if ( otherNode.type === "stopStory" ) {
        throw new Error();
    } else {
        throw new Error();
    }
} );
addPlotDevelopment( function ( plot ) {
    // Migrate a lampshading later in time, as long as it doesn't go later than its bookend (if any). If it crosses a choice boundary, duplicate it.
    
    var step = pickStep( plot.steps );
    if ( step === null )
        return plot;
    var lampshading = plot.get( step.start );
    if ( lampshading.type !== "lampshade" )
        return plot;
    var otherNode = plot.get( step.stop );
    
    if ( (otherNode.type === "lampshade"
            || otherNode.type === "foreshadow")
        && ((otherNode.bookend !== null
                && otherNode.bookend.val === lampshading.resource)
            || (lampshading.bookend !== null
                && lampshading.bookend.val === otherNode.resource)) )
        return plot;
    
    if ( otherNode.type === "doNothing"
        || otherNode.type === "lampshade"
        || otherNode.type === "foreshadow"
        || otherNode.type === "use"
        || otherNode.type === "startConcurrent"
        || otherNode.type === "stopConcurrent"
        || otherNode.type === "startChoice"
        || otherNode.type === "stopChoice" ) {
        
        var newNodes = plot.nodes.minusEntry( lampshading.name, lampshading );
        var newSteps = plot.steps.minusTruth( step );
        plot.steps.each( function ( name, prevStep ) {
            if ( prevStep.stop !== lampshading.name )
                return;
            newSteps = newSteps.minusTruth( prevStep ).
                plusTruth( makeStep( prevStep.start, otherNode.name ) );
        } );
        plot.steps.each( function ( name, prevStep ) {
            if ( prevStep.stop !== otherNode.name )
                return;
            var foreshadowing = { type: "foreshadow", name: gensym(), resource: lampshading.resource, bookend: null };
            newNodes = newNodes.plusEntry( foreshadowing.name, foreshadowing );
            newSteps = newSteps.minusTruth( nextStep ).
                plusTruth( makeStep( nextStep.start, foreshadowing.name ) ).
                plusTruth( makeStep( foreshadowing.name, nextStep.stop ) );
        } );
        plot.steps.each( function ( name, prevStep ) {
            if ( prevStep.stop !== otherNode.name )
                return;
            var newLampshading = { type: "lampshade", name: gensym(), resource: lampshading.resource, bookend: lampshading.bookend };
            newNodes = newNodes.plusEntry( newLampshading.name, newLampshading );
            newSteps = newSteps.minusTruth( prevStep ).
                plusTruth( makeStep( prevStep.start, newLampshading.name ) ).
                plusTruth( makeStep( newLampshading.name, prevStep.stop ) );
        } );
    } else if ( otherNode.type === "stopStory" ) {
        return plot;
    } else if ( otherNode.type === "startStory" ) {
        throw new Error();
    } else {
        throw new Error();
    }
} );


// TODO:
/*
* Migrate a lampshading later in time, as long as it doesn't go later than its bookend (if any). If it crosses a choice boundary, duplicate it.
* Upgrade a puzzle dependency to connote access to one of the points of interest (not already picked this way).
* Upgrade a puzzle dependency to connote access to one of the characters' uses. (If the same character is picked multiple times, each one represents a different thing the character can do.)
* Associate a bookendless foreshadowing or a lampshading with another that is earlier or later, respectively, as long as the outer one connotes a point of interest or a character use. Now the outer one is the bookend of the inner one.
* Associate a bookendless lampshading with a later bookendless foreshadowing. Now they're bookends of each other.

When a sufficient number of character uses have been assigned on every branch, the generation is complete.
*/
