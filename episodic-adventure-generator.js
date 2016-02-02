// episodic-adventure-generator.js
// Copyright 2016 Ross Angle. Released under the MIT License.

// NOTE: This file depends on randomlyPickWeighted() from
// monday-comics.js.

var nextGensymIndex = 1;
function gensym() {
    return "gs" + (nextGensymIndex++);
}

function makeStep( weight, start, stop ) {
    return { type: "step", name: gensym(), weight: weight,
        start: start, stop: stop };
}
function stepsEq( a, b ) {
    return a.name === b.name;
}

function labelPlotNode( node ) {
    if ( node.type === "doNothing" ) {
        return "Do nothing";
    } else if ( node.type === "lampshade" ) {
        return "Lampshade " + JSON.stringify( node.resource ) +
            (node.bookend === null ? "" :
                " (bookended by " +
                JSON.stringify( node.bookend.val ) + ")");
    } else if ( node.type === "foreshadow" ) {
        return "Foreshadow " + JSON.stringify( node.resource ) +
            (node.bookend === null ? "" :
                " (bookended by " +
                JSON.stringify( node.bookend.val ) + ")");
    } else if ( node.type === "use" ) {
        return "Use " + JSON.stringify( node.resource );
    } else if ( node.type === "startConcurrency" ) {
        return "Start concurrency";
    } else if ( node.type === "stopConcurrency" ) {
        return "Stop concurrency";
    } else if ( node.type === "startChoice" ) {
        return "Start choice";
    } else if ( node.type === "stopChoice" ) {
        return "Stop choice";
    } else if ( node.type === "startStory" ) {
        return "Start story";
    } else if ( node.type === "stopStory" ) {
        return "Stop story";
    } else {
        throw new Error();
    }
}

function Plot() {}
Plot.prototype.init_ = function ( nodes, steps ) {
    this.nodes_ = nodes;
    this.steps_ = steps;
    return this;
};
function makePlot() {
    return new Plot().init_( {}, {} );
}
Plot.prototype.toKey_ = function ( k ) {
    return "|" + k;
};
Plot.prototype.minusNodeName = function ( var_args ) {
    var self = this;
    var nodes = _.arrFoldl( self.nodes_, arguments,
        function ( nodes, nodeName, i ) {
        
        var newNodes = _.objCopy( nodes );
        delete newNodes[ self.toKey_( nodeName ) ];
        return newNodes;
    } );
    return new Plot().init_( nodes, self.steps_ );
};
Plot.prototype.minusStep = function ( var_args ) {
    var self = this;
    var steps = _.arrFoldl( self.steps_, arguments,
        function ( steps, step, i ) {
        
        var newSteps = _.objCopy( steps );
        delete newSteps[ self.toKey_( step.name ) ];
        return newSteps;
    } );
    return new Plot().init_( self.nodes_, steps );
};
Plot.prototype.plusNode = function ( var_args ) {
    var self = this;
    var nodes = _.arrFoldl( self.nodes_, arguments,
        function ( nodes, node, i ) {
        
        var newNodes = _.objCopy( nodes );
        newNodes[ self.toKey_( node.name ) ] = node;
        return newNodes;
    } );
    return new Plot().init_( nodes, self.steps_ );
};
Plot.prototype.plusStep = function ( step ) {
    var steps = _.objCopy( this.steps_ );
    steps[ this.toKey_( step.name ) ] = step;
    return new Plot().init_( this.nodes_, steps );
};
Plot.prototype.plusSteps = function ( weight, var_args ) {
    var stepNames = _.arrCut( arguments, 1 );
    var n = stepNames.length - 1;
    var eachWeight = weight / n;
    var result = this;
    _.repeat( stepNames.length - 1, function ( i ) {
        result = result.plusStep(
            makeStep( eachWeight,
                stepNames[ i ], stepNames[ i + 1 ] ) );
    } );
    return result;
};
Plot.prototype.replaceStep = function ( step, var_args ) {
    var without = this.minusStep( step );
    return without.plusSteps.apply( without,
        [ step.weight ].concat( _.arrCut( arguments, 1 ) ) );
};
Plot.prototype.getNode = function ( nodeName ) {
    return this.nodes_[ this.toKey_( nodeName ) ];
};
Plot.prototype.eachStep = function ( body ) {
    _.objOwnEach( this.steps_, function ( k, step ) {
        body( step );
    } );
};
Plot.prototype.randomlyPickStep = function () {
    var self = this;
    var weightedSteps = _.acc( function ( y ) {
        self.eachStep( function ( step ) {
            y( { weight: step.weight, val: step } );
        } );
    } );
    if ( weightedSteps.length === 0 )
        return null;
    return randomlyPickWeighted( weightedSteps );
};
Plot.prototype.toDotGraphNotation = function () {
    var self = this;
    var nameToDotName = {};
    var dotNameToName = {};
    var nameToLabel = {};
    var nextGensymIndex = 1;
    function gensym() {
        return "gs" + (nextGensymIndex++);
    }
    function addName( name ) {
        if ( _.hasOwn( nameToDotName, self.toKey_( name ) ) )
            return;
        var dotName = gensym();
        nameToDotName[ self.toKey_( name ) ] = dotName;
        dotNameToName[ self.toKey_( dotName ) ] = name;
        nameToLabel[ self.toKey_( name ) ] = "";
    }
    _.objOwnEach( self.nodes_, function ( k, node ) {
        addName( node.name );
    } );
    self.eachStep( function ( step ) {
        addName( step.start );
        addName( step.stop );
    } );
    _.objOwnEach( dotNameToName, function ( k, name ) {
        var node = self.getNode( name );
        if ( node === void 0 )
            return;
        nameToLabel[ self.toKey_( name ) ] = labelPlotNode( node );
    } );
    var result = "digraph g {\n";
    _.objOwnEach( dotNameToName, function ( k, name ) {
        function escapeDotDoubleQuotedString( s ) {
            // TODO: The GraphViz documentation doesn't seem to be
            // entirely clear about whether newlines need to be
            // escaped. For now, we just don't support newlines. Add
            // newline support once we investigate this further.
            if ( /[\r\n]/.test( s ) )
                throw new Error();
            return "\"" + s.replace( /"/g, "\\\"" ) + "\"";
        }
        function escapeDotEscString( s ) {
            return s.replace( /\\/g, "\\\\" );
        }
        function escapeDotDqEsc( s ) {
            return escapeDotDoubleQuotedString(
                escapeDotEscString( s ) );
        }
        var label = nameToLabel[ self.toKey_( name ) ];
        result += "    " +
            nameToDotName[ self.toKey_( name ) ] + " " +
            "[label=" + escapeDotDqEsc( label ) + "];\n";
    } );
    self.eachStep( function ( step ) {
        result += "    " +
            nameToDotName[ self.toKey_( step.start ) ] + " -> " +
            nameToDotName[ self.toKey_( step.stop ) ] + ";\n";
    } );
    result += "}\n";
    return result;
};
Plot.prototype.toJson = function () {
    var self = this;
    return {
        nodes: _.acc( function ( y ) {
            _.objOwnEach( self.nodes_, function ( k, node ) {
                y( node );
            } );
        } ),
        steps: _.acc( function ( y ) {
            self.eachStep( function ( step ) {
                y( step );
            } );
        } )
    };
};

var plotDevelopments = [];
function addPlotDevelopment( weight, plotDevelopment ) {
    plotDevelopments.push( { weight: weight, val: plotDevelopment } );
}

addPlotDevelopment( 1, function ( plot ) {
    // Add a beat to any step.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return plot;
    var node = { type: "doNothing", name: gensym() };
    return plot.plusNode( node ).
        replaceStep( step, step.start, node.name, step.stop );
} );
addPlotDevelopment( 2, function ( plot ) {
    // Turn any step into a converging choice of two possible steps.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return plot;
    var start = { type: "startChoice", name: gensym() };
    var stop = { type: "stopChoice", name: gensym() };
    var w = step.weight / 6;
    return plot.plusNode( start, stop ).minusStep( step ).
        plusSteps( w, step.start, start.name ).
        plusSteps( w * 2, start.name, stop.name ).
        plusSteps( w * 2, start.name, stop.name ).
        plusSteps( w, stop.name, step.stop );
} );
addPlotDevelopment( 2, function ( plot ) {
    // Turn any step into a converging concurrency of two steps.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return plot;
    var start = { type: "startConcurrency", name: gensym() };
    var stop = { type: "stopConcurrency", name: gensym() };
    var w = step.weight / 6;
    return plot.plusNode( start, stop ).minusStep( step ).
        plusSteps( w, step.start, start.name ).
        plusSteps( w * 2, start.name, stop.name ).
        plusSteps( w * 2, start.name, stop.name ).
        plusSteps( w, stop.name, step.stop );
} );
addPlotDevelopment( 2, function ( plot ) {
    // Add a fresh puzzle dependency to any step by foreshadowing it and lampshading it all at once.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return plot;
    var resource = gensym();
    var foreshadow = { type: "foreshadow", name: gensym(), resource: resource, bookend: null };
    var lampshade = { type: "lampshade", name: gensym(), resource: resource, bookend: null };
    return plot.plusNode( foreshadow, lampshade ).replaceStep( step,
        step.start, foreshadow.name, lampshade.name, step.stop );
} );
addPlotDevelopment( 3, function ( plot ) {
    // Add a non-consuming use to any foreshadowing.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return plot;
    var foreshadowing = plot.getNode( step.start );
    if ( foreshadowing.type !== "foreshadow" )
        return plot;
    
    var node = { type: "use", name: gensym(), resource: foreshadowing.resource };
    return plot.plusNode( node ).
        replaceStep( step, step.start, node.name, step.stop );
} );
addPlotDevelopment( 5, function ( plot ) {
    // Migrate all but one branch of a branching node earlier in time.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return plot;
    var movingNode = plot.getNode( step.start );
    if ( !(movingNode.type === "startConcurrency"
        || movingNode.type === "startChoice") )
        return plot;
    var newPlot = plot;
    newPlot.eachStep( function ( intoStep ) {
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
            
            newPlot.eachStep( function ( prevStep ) {
                if ( prevStep.stop !== otherNode.name )
                    return;
                newPlot = newPlot.replaceStep( prevStep,
                    prevStep.start, movingNode.name );
            } );
            newPlot = newPlot.
                replaceStep( step, otherNode.name, step.stop ).
                replaceStep( intoStep,
                    movingNode.name, otherNode.name );
            
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

addPlotDevelopment( 5, function ( plot ) {
    // Migrate a foreshadowing earlier in time, as long as it doesn't go earlier than its bookend (if any). If it crosses a branching node, add a corresponding lampshading on the other branch. If it encounters a lampshading of the same resource, merge the region by removing both the lampshading and the foreshadowing.
    
    var step = plot.randomlyPickStep();
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
        var spanCount = 0;
        var spanWeight = step.weight;
        newPlot.eachStep( function ( prevStep ) {
            if ( prevStep.stop !== step.start )
                return;
            newPlot.eachStep( function ( nextStep ) {
                if ( nextStep.start !== step.stop )
                    return;
                spanCount++;
            } );
        } );
        newPlot.eachStep( function ( otherStep ) {
            if ( !(otherStep.stop === step.start
                || otherStep.start === step.stop) )
                return;
            spanWeight += otherStep.weight;
            newPlot = newPlot.minusStep( step );
        } );
        newPlot.eachStep( function ( prevStep ) {
            if ( prevStep.stop !== step.start )
                return;
            newPlot.eachStep( function ( nextStep ) {
                if ( nextStep.start !== step.stop )
                    return;
                newPlot = newPlot.plusSteps( spanWeight / stepCount,
                    prevStep.start, nextStep.stop );
            } );
        } );
        newPlot.eachStep( function ( otherStep ) {
            if ( !(otherStep.stop === step.start
                || otherStep.start === step.stop) )
                return;
            newPlot = newPlot.minusStep( step );
        } );
        return newPlot.minusNodeName( step.start, step.stop );
    }
    
    if ( otherNode.type === "doNothing"
        || otherNode.type === "foreshadow"
        || otherNode.type === "lampshade"
        || otherNode.type === "use"
        || otherNode.type === "startConcurrency"
        || otherNode.type === "stopConcurrency"
        || otherNode.type === "startChoice"
        || otherNode.type === "stopChoice" ) {
        
        var newPlot = plot.minusNodeName( foreshadowing.name ).
            minusStep( step );
        newPlot.eachStep( function ( nextStep ) {
            if ( nextStep.start !== otherNode.name )
                return;
            if ( stepsEq( step, nextStep ) )
                return;
            var lampshading = { type: "lampshade", name: gensym(), resource: foreshadowing.resource, bookend: null };
            newPlot = newPlot.plusNode( lampshading ).
                replaceStep( nextStep,
                    nextStep.start,
                    lampshading.name,
                    nextStep.stop );
        } );
        newPlot.eachStep( function ( nextStep ) {
            if ( nextStep.start !== foreshadowing.name )
                return;
            newPlot = newPlot.replaceStep( nextStep,
                otherNode.name, nextStep.stop );
        } );
        newPlot.eachStep( function ( prevStep ) {
            if ( prevStep.stop !== otherNode.name )
                return;
            var newForeshadowing = { type: "foreshadow", name: gensym(), resource: foreshadowing.resource, bookend: foreshadowing.bookend };
            newPlot = newPlot.plusNode( newForeshadowing ).
                replaceStep( prevStep,
                    prevStep.start,
                    newForeshadowing.name,
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
addPlotDevelopment( 5, function ( plot ) {
    // Migrate a lampshading later in time, as long as it doesn't go later than its bookend (if any). If it crosses a rejoining node, add a corresponding foreshadowing on the other branch. If it encounters a foreshadowing of the same resource, merge the region by removing both the lampshading and the foreshadowing.
    
    var step = plot.randomlyPickStep();
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
        var spanCount = 0;
        var spanWeight = step.weight;
        newPlot.eachStep( function ( prevStep ) {
            if ( prevStep.stop !== step.start )
                return;
            newPlot.eachStep( function ( nextStep ) {
                if ( nextStep.start !== step.stop )
                    return;
                spanCount++;
            } );
        } );
        newPlot.eachStep( function ( otherStep ) {
            if ( !(otherStep.stop === step.start
                || otherStep.start === step.stop) )
                return;
            spanWeight += otherStep.weight;
            newPlot = newPlot.minusStep( step );
        } );
        newPlot.eachStep( function ( prevStep ) {
            if ( prevStep.stop !== step.start )
                return;
            newPlot.eachStep( function ( nextStep ) {
                if ( nextStep.start !== step.stop )
                    return;
                newPlot = newPlot.plusSteps( spanWeight / stepCount,
                    prevStep.start, nextStep.stop );
            } );
        } );
        newPlot.eachStep( function ( otherStep ) {
            if ( !(otherStep.stop === step.start
                || otherStep.start === step.stop) )
                return;
            newPlot = newPlot.minusStep( step );
        } );
        return newPlot.minusNodeName( step.start, step.stop );
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
            plot.minusNodeName( lampshading.name ).minusStep( step );
        newPlot.eachStep( function ( prevStep ) {
            if ( prevStep.stop !== otherNode.name )
                return;
            if ( stepsEq( step, prevStep ) )
                return;
            var foreshadowing = { type: "foreshadow", name: gensym(), resource: lampshading.resource, bookend: null };
            newPlot = newPlot.plusNode( foreshadowing ).
                replaceStep( prevStep,
                    prevStep.start,
                    foreshadowing.name,
                    prevStep.stop );
        } );
        newPlot.eachStep( function ( prevStep ) {
            if ( prevStep.stop !== lampshading.name )
                return;
            newPlot = newPlot.replaceStep( prevStep,
                prevStep.start, otherNode.name );
        } );
        newPlot.eachStep( function ( nextStep ) {
            if ( nextStep.start !== otherNode.name )
                return;
            var newLampshading = { type: "lampshade", name: gensym(), resource: lampshading.resource, bookend: lampshading.bookend };
            newPlot = newPlot.plusNode( newLampshading ).
                replaceStep( nextStep,
                    nextStep.start,
                    newLampshading.name,
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

addPlotDevelopment( 3, function ( plot ) {
    // Associate a bookendless lampshading with a later bookendless foreshadowing. Now they're bookends of each other.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return plot;
    var lampshading = plot.getNode( step.start );
    if ( lampshading.type !== "lampshade" )
        return plot;
    var foreshadowing = plot.getNode( step.stop );
    if ( foreshadowing.type !== "foreshadow" )
        return plot;
    
    return plot.minusNodeName( step.start, step.stop ).
        plusNode( { type: "lampshade", name: step.start, resource: lampshading.resource, bookend: { val: foreshadowing.resource } } ).
        plusNode( { type: "foreshadow", name: step.stop, resource: foreshadowing.resource, bookend: { val: lampshading.resource } } );
} );

// TODO:
/*
When a sufficient number of character uses have been assigned on every branch, the generation is complete.
*/

function randomlyPickPlot() {
    
    //        ,------- * ----- *
    //       /       /
    // * - * - * - * - * ----- *
    //           \       \
    //            `------- * - *
    
    var stopChoice1 = { type: "stopChoice", name: gensym() };
    var stopStory1 = { type: "stopStory", name: gensym() };
    
    var startStory = { type: "startStory", name: gensym() };
    var startChoice1 = { type: "startChoice", name: gensym() };
    var startChoice2 = { type: "startChoice", name: gensym() };
    var startChoice3 = { type: "startChoice", name: gensym() };
    var startChoice4 = { type: "startChoice", name: gensym() };
    var stopStory2 = { type: "stopStory", name: gensym() };
    
    var stopChoice3 = { type: "stopChoice", name: gensym() };
    var stopStory3 = { type: "stopStory", name: gensym() };
    
    var w = 1 / 14;
    
    var plot = makePlot().plusNode(
        stopChoice1,
        stopStory1,
        
        startStory,
        startChoice1,
        startChoice2,
        startChoice3,
        startChoice4,
        stopStory2,
        
        stopChoice3,
        stopStory3
    ).
        plusSteps( w * 2, startStory.name, startChoice1.name ).
        plusSteps( w * 4, startChoice1.name, startChoice2.name,
            startChoice3.name, startChoice4.name, stopStory2.name ).
        plusSteps( w * 2, startChoice1.name, stopChoice1.name ).
        plusSteps( w, stopChoice1.name, stopStory1.name ).
        plusSteps( w * 2, startChoice2.name, stopChoice3.name ).
        plusSteps( w, stopChoice3.name, stopStory3.name ).
        plusSteps( w, startChoice3.name, stopChoice1.name ).
        plusSteps( w, startChoice4.name, stopChoice3.name );
    
    
    // TODO: Use the termination condition described in the TODO
    // above. At least don't hardcode 50 iterations here.
    _.repeat( 50, function () {
        var plotDevelopment =
            randomlyPickWeighted( plotDevelopments );
        plot = plotDevelopment( plot );
    } );
    
    
    return plot;
}
