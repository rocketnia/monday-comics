function pickStep( plot ) {
    // TODO
}
function makeStep( start, stop ) {
    return { type: "step", name: gensym(), start: start, stop: stop };
}
function stepsEq( a, b ) {
    return a.name === b.name;
}

function Plot() {}
Plot.prototype.init = function () {
    this.nodes_ = {};
    this.steps_ = {};
};
function makePlot() {
    return new Plot().init();
}
Plot.prototype.minusNode = function ( var_args ) {
    var nodeNames = arguments;
    // TODO
};
Plot.prototype.minusStep = function ( var_args ) {
    // TODO
};
Plot.prototype.plusNode = function ( node ) {
    // TODO
};
Plot.prototype.plusStep = function ( step ) {
    // TODO
};
Plot.prototype.plusSteps = function ( var_args ) {
    var nodeNames = arguments;
    // TODO
};
Plot.prototype.getNode = function ( nodeName ) {
    // TODO
};
Plot.prototype.eachStep = function ( body ) {
    // TODO
};

addPlotDevelopment( function ( plot ) {
    // Add a beat to any step.
    
    var step = pickStep( plot );
    if ( step === null )
        return plot;
    var node = { type: "doNothing", name: gensym() };
    return plot.plusNode( node ).minusStep( step ).
        plusSteps( step.start, node.name, step.stop );
} );
addPlotDevelopment( function ( plot ) {
    // Turn any step into a converging choice of two possible steps.
    
    var step = pickStep( plot );
    if ( step === null )
        return plot;
    var start = { type: "startChoice", name: gensym() };
    var stop = { type: "stopChoice", name: gensym() };
    return plot.plusNode( start, stop ).minusStep( step ).
        plusSteps( step.start, start.name, stop.name, step.stop ).
        plusSteps( start.name, stop.name );
} );
addPlotDevelopment( function ( plot ) {
    // Turn any step into a converging concurrency of two steps.
    
    var step = pickStep( plot );
    if ( step === null )
        return plot;
    var start = { type: "startConcurrency", name: gensym() };
    var stop = { type: "stopConcurrency", name: gensym() };
    return plot.plusNode( start, stop ).minusStep( step ).
        plusSteps( step.start, start.name, stop.name, step.stop ).
        plusSteps( start.name, stop.name );
} );
addPlotDevelopment( function ( plot ) {
    // Add a fresh puzzle dependency to any step by foreshadowing it and lampshading it all at once.
    
    var step = pickStep( plot );
    if ( step === null )
        return plot;
    var resource = gensym();
    var foreshadow = { type: "foreshadow", name: gensym(), resource: resource, bookend: null };
    var lampshade = { type: "lampshade", name: gensym(), resource: resource, bookend: null };
    return plot.plusNode( node ).minusStep( step ).plusSteps(
        step.start, foreshadow.name, lampshade.name, step.stop );
} );
addPlotDevelopment( function ( plot ) {
    // Add a non-consuming use to any foreshadowing.
    
    var step = pickStep( plot );
    if ( step === null )
        return plot;
    var foreshadowing = plot.getNode( step.start );
    if ( foreshadowing.type !== "foreshadow" )
        return plot;
    
    var node = { type: "use", name: gensym(), resource: foreshadowing.resource };
    return plot.plusNode( node ).minusStep( step ).
        plusSteps( step.start, node.name, step.stop );
} );
addPlotDevelopment( function ( plot ) {
    // Migrate all but one branch of a branching node earlier in time.
    
    var step = pickStep( plot );
    if ( step === null )
        return plot;
    var movingNode = plot.getNode( step.start );
    if ( !(movingNode.type === "startConcurrency"
        || movingNode.type === "startChoice") )
        return plot;
    var newPlot = plot;
    newPlot.eachStep( function ( name, intoStep ) {
        if ( intoStep.stop !== movingNode.name )
            return;
        var otherNode = plot.getNode( intoStep.start );
        
        if ( otherNode.type === "doNothing"
            || otherNode.type === "use" ) {
            
            // TODO: This is the only asymmetrical case so far. See if
            // we should make it symmetrical too.
            
            // * - o - m - *
            //           ` *
            // ->
            // * - m - o - *
            //       `---- *
            
            newPlot = newPlot.minusStep( step, intoStep ).plusSteps(
                movingNode.name, otherNode.name, step.stop );
            newPlot.eachStep( function ( name, prevStep ) {
                if ( prevStep.stop !== otherNode.name )
                    return;
                newPlot = newPlot.minusStep( prevStep ).
                    plusSteps( prevStep.start, movingStep.name );
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
    return newPlot;
} );

// TODO:
/*
* Migrate all but one branch of a rejoining node later in time.
*/

addPlotDevelopment( function ( plot ) {
    // Migrate a foreshadowing earlier in time, as long as it doesn't go earlier than its bookend (if any). If it crosses a branching node, add a corresponding lampshading on the other branch. If it encounters a lampshading of the same resource, merge the region by removing both the lampshading and the foreshadowing.
    
    var step = pickStep( plot );
    if ( step === null )
        return plot;
    var foreshadowing = plot.getNode( step.stop );
    if ( foreshadowing.type !== "foreshadow" )
        return plot;
    var otherNode = plot.getNode( step.start );
    
    if ( (otherNode.type === "foreshadow"
            || otherNode.type === "lampshade")
        && ((otherNode.bookend !== null
                && otherNode.bookend.val === foreshadowing.resource)
            || (foreshadowing.bookend !== null
                && foreshadowing.bookend.val === otherNode.resource)) )
        return plot;
    
    if ( otherNode.type === "lampshade"
        && otherNode.resource === foreshadowing.resource ) {
        
        var newPlot = plot.minusStep( step );
        newPlot.eachStep( function ( name, prevStep ) {
            if ( prevStep.stop !== step.start )
                return;
            newPlot.eachStep( function ( name, nextStep ) {
                if ( nextStep.start !== step.stop )
                    return;
                newPlot = newPlot.plusSteps(
                    prevStep.start, nextStep.stop );
            } );
        } );
        newPlot.eachStep( function ( name, otherStep ) {
            if ( !(otherStep.stop === step.start
                || otherStep.start === step.stop) )
                return;
            newPlot = newPlot.minusStep( step );
        } );
        return newPlot.minusNode( step.start, step.stop );
    }
    
    if ( otherNode.type === "doNothing"
        || otherNode.type === "foreshadow"
        || otherNode.type === "lampshade"
        || otherNode.type === "use"
        || otherNode.type === "startConcurrency"
        || otherNode.type === "stopConcurrency"
        || otherNode.type === "startChoice"
        || otherNode.type === "stopChoice" ) {
        
        var newPlot =
            plot.minusNode( foreshadowing.name ).minusStep( step );
        newPlot.eachStep( function ( name, nextStep ) {
            if ( nextStep.start !== otherNode.name )
                return;
            if ( stepsEq( step, nextStep ) )
                return;
            var lampshading = { type: "lampshade", name: gensym(), resource: foreshadowing.resource, bookend: null };
            newPlot = newPlot.plusNode( lampshading ).
                minusStep( nextStep ).
                plusSteps(
                    nextStep.start, lampshading.name, nextStep.stop );
        } );
        newPlot.each( function ( name, nextStep ) {
            if ( nextStep.start !== foreshadowing.name )
                return;
            newPlot = newPlot.minusStep( nextStep ).
                plusSteps( otherNode.name, nextStep.stop );
        } );
        newPlot.each( function ( name, prevStep ) {
            if ( prevStep.stop !== otherNode.name )
                return;
            var newForeshadowing = { type: "foreshadow", name: gensym(), resource: foreshadowing.resource, bookend: foreshadowing.bookend };
            newPlot = newPlot.plusNode( newForeshadowing ).
                minusStep( prevStep ).
                plusSteps( prevStep.start, newForeshadowing.name,
                    prevStep.stop );
        } );
        return newPlot;
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
    
    var step = pickStep( plot );
    if ( step === null )
        return plot;
    var lampshading = plot.getNode( step.start );
    if ( lampshading.type !== "lampshade" )
        return plot;
    var otherNode = plot.getNode( step.stop );
    
    if ( (otherNode.type === "lampshade"
            || otherNode.type === "foreshadow")
        && ((otherNode.bookend !== null
                && otherNode.bookend.val === lampshading.resource)
            || (lampshading.bookend !== null
                && lampshading.bookend.val === otherNode.resource)) )
        return plot;
    
    if ( otherNode.type === "foreshadow"
        && otherNode.resource === lampshading.resource ) {
        
        var newPlot = plot.minusStep( step );
        newPlot.eachStep( function ( name, prevStep ) {
            if ( prevStep.stop !== step.start )
                return;
            newPlot.eachStep( function ( name, nextStep ) {
                if ( nextStep.start !== step.stop )
                    return;
                newPlot = newPlot.plusSteps(
                    prevStep.start, nextStep.stop );
            } );
        } );
        newPlot.eachStep( function ( name, otherStep ) {
            if ( !(otherStep.stop === step.start
                || otherStep.start === step.stop) )
                return;
            newPlot = newPlot.minusStep( step );
        } );
        return newPlot.minusNode( step.start, step.stop );
    }
    
    if ( otherNode.type === "doNothing"
        || otherNode.type === "lampshade"
        || otherNode.type === "foreshadow"
        || otherNode.type === "use"
        || otherNode.type === "startConcurrency"
        || otherNode.type === "stopConcurrency"
        || otherNode.type === "startChoice"
        || otherNode.type === "stopChoice" ) {
        
        var newPlot =
            plot.minusNode( lampshading.name ).minusStep( step );
        newPlot.eachStep( function ( name, prevStep ) {
            if ( prevStep.stop !== otherNode.name )
                return;
            if ( stepsEq( step, prevStep ) )
                return;
            var foreshadowing = { type: "foreshadow", name: gensym(), resource: lampshading.resource, bookend: null };
            newPlot = newPlot.plusNode( foreshadowing ).
                minusStep( prevStep ).
                plusSteps( prevStep.start, foreshadowing.name,
                    prevStep.stop );
        } );
        newPlot.eachStep( function ( name, prevStep ) {
            if ( prevStep.stop !== lampshading.name )
                return;
            newPlot = newPlot.minusStep( prevStep ).
                plusSteps( prevStep.start, otherNode.name );
        } );
        newPlot.eachStep( function ( name, nextStep ) {
            if ( nextStep.stop !== otherNode.name )
                return;
            var newLampshading = { type: "lampshade", name: gensym(), resource: lampshading.resource, bookend: lampshading.bookend };
            newPlot = newPlot.plusStep( newLampshading ).
                minusTruth( nextStep ).
                plusSteps( nextStep.start, newLampshading.name,
                    nextStep.stop );
        } );
        return newPlot;
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
    
    var step = pickStep( plot );
    if ( step === null )
        return plot;
    var lampshading = plot.getNode( step.start );
    if ( lampshading.type !== "lampshade" )
        return plot;
    var foreshadowing = plot.getNode( step.stop );
    if ( foreshadowing.type !== "foreshadow" )
        return plot;
    
    return plot.minusNode( step.start, step.stop ).
        plusNode( { type: "foreshadow", name: step.start, resource: foreshadowing.resource, bookend: { val: lampshading.resource } } ).
        plusNode( { type: "lampshade", name: step.stop, resource: lampshading.resource, bookend: { val: foreshadowing.resource } } );
} );

// TODO:
/*
When a sufficient number of character uses have been assigned on every branch, the generation is complete.
*/
