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
    // Turn any step into a converging choice of two possible steps.
    
    var step = pickStep( plot.steps );
    if ( step === null )
        return plot;
    var start = { type: "startChoice", name: gensym() };
    var stop = { type: "stopChoice", name: gensym() };
    return plotWithNodesAndSteps( plot,
        plot.nodes.
            plusEntry( start.name, start ).
            plusEntry( stop.name, stop ),
        plot.steps.minusTruth( step ).
            plusTruth( makeStep( step.start, start.name ) ).
            plusTruth( makeStep( start.name, stop.name ) ).
            plusTruth( makeStep( start.name, stop.name ) ).
            plusTruth( makeStep( stop.name, stop: step.stop ) ) );
} );
addPlotDevelopment( function ( plot ) {
    // Turn any step into a converging concurrency of two steps.
    
    var step = pickStep( plot.steps );
    if ( step === null )
        return plot;
    var start = { type: "startConcurrency", name: gensym() };
    var stop = { type: "stopConcurrency", name: gensym() };
    return plotWithNodesAndSteps( plot,
        plot.nodes.
            plusEntry( start.name, start ).
            plusEntry( stop.name, stop ),
        plot.steps.minusTruth( step ).
            plusTruth( makeStep( step.start, start.name ) ).
            plusTruth( makeStep( start.name, stop.name ) ).
            plusTruth( makeStep( start.name, stop.name ) ).
            plusTruth( makeStep( stop.name, stop: step.stop ) ) );
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
    // Migrate all but one branch of a branching node earlier in time.
    
    var step = pickStep( plot.steps );
    if ( step === null )
        return plot;
    var movingNode = plot.get( step.start );
    if ( !(movingNode.type === "startConcurrency"
        || movingNode.type === "startChoice") )
        return plot;
    var newNodes = plot.nodes;
    var newSteps = plot.steps;
    newSteps.each( function ( name, intoStep ) {
        if ( intoStep.stop !== movingNode.name )
            return;
        var otherNode = plot.get( intoStep.start );
        
        if ( otherNode.type === "doNothing"
            || otherNode.type === "use" ) {
            
            // TODO: This is the only asymmetrical case so far. See if
            // we should make it symmetrical too.
            
            // * - o - m - *
            //           ` *
            // ->
            // * - m - o - *
            //       `---- *
            
            newSteps = newSteps.
                minusTruth( step ).
                minusTruth( intoStep ).
                plusTruth( makeStep( otherNode.name, step.stop ) ).
                plusTruth(
                    makeStep( movingNode.name, otherNode.name ) );
            newSteps.each( function ( name, prevStep ) {
                if ( prevStep.stop !== otherNode.name )
                    return;
                newSteps = newSteps.minusTruth( prevStep ).
                    plusTruth(
                        makeStep( prevStep.start, movingStep.name ) );
            } );
            
        } else if (
            otherNode.type === "startConcurrency"
            || otherNode.type === "stopConcurrency"
            || otherNode.type === "startChoice"
            || otherNode.type === "stopChoice" ) {
            
            if ( otherNode.type === "startConcurrency"
                || otherNode.type === "startChoice" ) {
                
                if ( movingNode.type === otherNode.type ) {
                    // * - o - m - *a
                    //      \    ` *b
                    //       `---- *c
                    // ->
                    // * - m - o - *a
                    //      \    ` *c
                    //       `---- *b
                    
                    // TODO
                } else {
                    // * - o - m - *a
                    //      \    ` *b
                    //       `---- *c
                    // ->
                    // * - m - o ----- *a
                    //      \    \
                    //       ` o - * - *c
                    //           `---- *b
                    
                    // TODO
                }
            } else {
                // If m and o are the same:
                //
                // * - o - m - *
                // * '       ` *
                // ->
                // * ----- o - *
                //       /
                // * - m ----- *
                // or
                // * - m - o - *
                //       X
                // * - m - o - *
                //
                // NOTE: We may want to use the more complex one just
                // to keep things symmetrical.
                
                // If o is stopChoice and m is startConcurrency:
                //
                // * - o - m - *
                // * '       ` *
                // ->
                // * - m - o - *
                //       X
                // * - m - o - *
                
                // If o is stopConcurrency and m is startChoice:
                //
                // * - o - m - *
                // * '       ` *
                // ->
                // * - m - o - *
                //       X
                // * - m - o - *
                //
                // ...except that this is the only case where we have
                // a single decision being made concurrently with
                // itself. This is kind of unprecedented in the rest
                // of the system.
                //
                // We'll probably want to label choice nodes with
                // boolean expressions over propositional variables,
                // not necessarily because we logically need to, but
                // because it might help in comprehending the
                // generated story.
                
                // TODO: Decide which specific option to do in each
                // case, and implement it.
            }
            
        } else if (
            otherNode.type === "foreshadow"
            || otherNode.type === "lampshade"
            || otherNode.type === "startStory" ) {
            
            // Do nothing.
            
        } else if ( otherNode.type === "stopStory" ) {
            throw new Error();
        } else {
            throw new Error();
        }
    } );
    return plotWithNodesAndSteps( plot, newNodes, newSteps );
} );

// TODO:
/*
* Migrate all but one branch of a rejoining node later in time.
*/

addPlotDevelopment( function ( plot ) {
    // Migrate a foreshadowing earlier in time, as long as it doesn't go earlier than its bookend (if any). If it crosses a branching node, add a corresponding lampshading on the other branch. If it encounters a lampshading of the same resource, merge the region by removing both the lampshading and the foreshadowing.
    
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
    
    if ( otherNode.type === "lampshade"
        && otherNode.resource === foreshadowing.resource ) {
        
        var newSteps = plot.steps.minusTruth( step );
        newSteps.each( function ( name, prevStep ) {
            if ( prevStep.stop !== step.start )
                return;
            newSteps.each( function ( name, nextStep ) {
                if ( nextStep.start !== step.stop )
                    return;
                newSteps = newSteps.plusTruth(
                    makeStep( prevStep.start, nextStep.stop ) );
            } );
        } );
        newSteps.each( function ( name, otherStep ) {
            if ( !(otherStep.stop === step.start
                || otherStep.start === step.stop) )
                return;
            newSteps = newSteps.minusTruth( step );
        } );
        return plotWithNodesAndSteps( plot,
            plot.nodes.
                minusEntry( step.start ).
                minusEntry( step.stop ),
            newSteps );
    }
    
    if ( otherNode.type === "doNothing"
        || otherNode.type === "foreshadow"
        || otherNode.type === "lampshade"
        || otherNode.type === "use"
        || otherNode.type === "startConcurrency"
        || otherNode.type === "stopConcurrency"
        || otherNode.type === "startChoice"
        || otherNode.type === "stopChoice" ) {
        
        var newNodes = plot.nodes.minusEntry( foreshadowing.name );
        var newSteps = plot.steps.minusTruth( step );
        newSteps.each( function ( name, nextStep ) {
            if ( nextStep.start !== otherNode.name )
                return;
            if ( stepsEq( step, nextStep ) )
                return;
            var lampshading = { type: "lampshade", name: gensym(), resource: foreshadowing.resource, bookend: null };
            newNodes = newNodes.plusEntry( lampshading.name, lampshading );
            newSteps = newSteps.minusTruth( nextStep ).
                plusTruth( makeStep( nextStep.start, lampshading.name ) ).
                plusTruth( makeStep( lampshading.name, nextStep.stop ) );
        } );
        newSteps.each( function ( name, nextStep ) {
            if ( nextStep.start !== foreshadowing.name )
                return;
            newSteps = newSteps.minusTruth( nextStep ).
                plusTruth( makeStep( otherNode.name, nextStep.stop ) );
        } );
        newSteps.each( function ( name, prevStep ) {
            if ( prevStep.stop !== otherNode.name )
                return;
            var newForeshadowing = { type: "foreshadow", name: gensym(), resource: foreshadowing.resource, bookend: foreshadowing.bookend };
            newNodes = newNodes.plusEntry( newForeshadowing.name, newForeshadowing );
            newSteps = newSteps.minusTruth( prevStep ).
                plusTruth( makeStep( prevStep.start, newForeshadowing.name ) ).
                plusTruth( makeStep( newForeshadowing.name, prevStep.stop ) );
        } );
        return plotWithNodesAndSteps( plot, newNodes, newSteps );
    } else if ( otherNode.type === "startStory" ) {
        return plot;
    } else if ( otherNode.type === "stopStory" ) {
        throw new Error();
    } else {
        throw new Error();
    }
} );
addPlotDevelopment( function ( plot ) {
    // Migrate a lampshading later in time, as long as it doesn't go later than its bookend (if any). If it crosses a rejoining node, add a corresponding foreshadowing on the other branch. If it encounters a foreshadowing of the same resource, merge the region by removing both the lampshading and the foreshadowing.
    
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
    
    if ( otherNode.type === "foreshadow"
        && otherNode.resource === lampshading.resource ) {
        
        var newSteps = plot.steps.minusTruth( step );
        newSteps.each( function ( name, prevStep ) {
            if ( prevStep.stop !== step.start )
                return;
            newSteps.each( function ( name, nextStep ) {
                if ( nextStep.start !== step.stop )
                    return;
                newSteps = newSteps.plusTruth(
                    makeStep( prevStep.start, nextStep.stop ) );
            } );
        } );
        newSteps.each( function ( name, otherStep ) {
            if ( !(otherStep.stop === step.start
                || otherStep.start === step.stop) )
                return;
            newSteps = newSteps.minusTruth( step );
        } );
        return plotWithNodesAndSteps( plot,
            plot.nodes.
                minusEntry( step.start ).
                minusEntry( step.stop ),
            newSteps );
    }
    
    if ( otherNode.type === "doNothing"
        || otherNode.type === "lampshade"
        || otherNode.type === "foreshadow"
        || otherNode.type === "use"
        || otherNode.type === "startConcurrency"
        || otherNode.type === "stopConcurrency"
        || otherNode.type === "startChoice"
        || otherNode.type === "stopChoice" ) {
        
        var newNodes = plot.nodes.minusEntry( lampshading.name );
        var newSteps = plot.steps.minusTruth( step );
        if ( otherNode.type === "stopChoice" )
            newSteps.each( function ( name, prevStep ) {
                if ( prevStep.stop !== otherNode.name )
                    return;
                if ( stepsEq( step, prevStep ) )
                    return;
                var foreshadowing = { type: "foreshadow", name: gensym(), resource: lampshading.resource, bookend: null };
                newNodes = newNodes.plusEntry( foreshadowing.name, foreshadowing );
                newSteps = newSteps.minusTruth( prevStep ).
                    plusTruth( makeStep( prevStep.start, foreshadowing.name ) ).
                    plusTruth( makeStep( foreshadowing.name, prevStep.stop ) );
            } );
        newSteps.each( function ( name, prevStep ) {
            if ( prevStep.stop !== lampshading.name )
                return;
            newSteps = newSteps.minusTruth( prevStep ).
                plusTruth( makeStep( prevStep.start, otherNode.name ) );
        } );
        newSteps.each( function ( name, nextStep ) {
            if ( nextStep.stop !== otherNode.name )
                return;
            var newLampshading = { type: "lampshade", name: gensym(), resource: lampshading.resource, bookend: lampshading.bookend };
            newNodes = newNodes.plusEntry( newLampshading.name, newLampshading );
            newSteps = newSteps.minusTruth( nextStep ).
                plusTruth( makeStep( nextStep.start, newLampshading.name ) ).
                plusTruth( makeStep( newLampshading.name, nextStep.stop ) );
        } );
        return plotWithNodesAndSteps( plot, newNodes, newSteps );
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
* Upgrade a puzzle dependency to connote access to one of the points of interest (not already picked this way).
* Upgrade a puzzle dependency to connote access to one of the characters' uses. (If the same character is picked multiple times, each one represents a different thing the character can do.)
* Associate a bookendless foreshadowing or a lampshading with another that is earlier or later, respectively, as long as the outer one connotes a point of interest or a character use. Now the outer one is the bookend of the inner one.
*/

addPlotDevelopment( function ( plot ) {
    // Associate a bookendless lampshading with a later bookendless foreshadowing. Now they're bookends of each other.
    
    var step = pickStep( plot.steps );
    if ( step === null )
        return plot;
    var lampshading = plot.get( step.start );
    if ( lampshading.type !== "lampshade" )
        return plot;
    var foreshadowing = plot.get( step.stop );
    if ( foreshadowing.type !== "foreshadow" )
        return plot;
    
    return plotWithNodesAndSteps( plot,
        plot.nodes.minusEntry( step.start ).minusEntry( step.stop ).
            plusEntry( step.start, { type: "foreshadow", name: step.start, resource: foreshadowing.resource, bookend: { val: lampshading.resource } } ).
            plusEntry( step.stop, { type: "lampshade", name: step.stop, resource: lampshading.resource, bookend: { val: foreshadowing.resource } } ),
        plot.steps );
} );

// TODO:
/*
When a sufficient number of character uses have been assigned on every branch, the generation is complete.
*/
