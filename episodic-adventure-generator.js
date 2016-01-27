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
        || otherNode.type === "choice" ) {
        
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
            if ( otherNode.type !== "choice" )
                throw new Error();
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
    } else if ( otherNode.type === "start" ) {
        return plot;
    } else if ( otherNode.type === "stop" ) {
        throw new Error();
    } else {
        throw new Error();
    }
} );
