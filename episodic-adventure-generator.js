// episodic-adventure-generator.js
// Copyright 2016 Ross Angle. Released under the MIT License.

// NOTE: This file depends on randomlyPickDouble(), randomlyPickNat(),
// and randomlyPickWeighted() from monday-comics.js.

function randomlyDecide( trueProbability ) {
    return randomlyPickDouble( 1 ) < trueProbability;
}
function randomlyPickElement( arr ) {
    return arr[ randomlyPickNat( arr.length ) ];
}

var nextGensymIndex = 1;
function gensym() {
    return "gs" + (nextGensymIndex++);
}

function makeStep( weight, start, stop ) {
    if ( !_.isNumber( weight ) )
        throw new Error();
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
        return "Fork";
    } else if ( node.type === "stopConcurrency" ) {
        return "Join";
    } else if ( node.type === "startChoice" ) {
        return (node.choiceMadeHere ? "Make " : "Sync on ") +
            "choice " + JSON.stringify( node.choice );
    } else if ( node.type === "stopChoice" ) {
        return "Discard choice " + JSON.stringify( node.choice );
    } else if ( node.type === "startStory" ) {
        return "Start story";
    } else if ( node.type === "stopStory" ) {
        return "Stop story";
    } else {
        throw new Error();
    }
}

function plotNodeFamily( node ) {
    if ( node.type === "startStory"
        || node.type === "stopStory" )
        return "choice";
    else if ( node.type === "startConcurrency"
        || node.type === "stopConcurrency" )
        return "concurrency";
    else if ( node.type === "startChoice"
        || node.type === "stopChoice" )
        return "choice";
    else if ( node.type === "foreshadow"
        || node.type === "lampshade" )
        return "foreshadow";
    else if ( node.type === "doNothing" )
        return "doNothing";
    else if ( node.type === "use" )
        return "use";
    else
        throw new Error();
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
        
        if ( node.type === "stopChoice" && node.choice === void 0 )
            throw new Error();
        var newNodes = _.objCopy( nodes );
        newNodes[ self.toKey_( node.name ) ] = node;
        return newNodes;
    } );
    return new Plot().init_( nodes, self.steps_ );
};
Plot.prototype.plusStep = function ( step ) {
    if ( !_.likeObjectLiteral( step ) )
        throw new Error();
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
            if ( !_.isNumber( step.weight ) )
                throw new Error();
            y( { weight: step.weight, val: step } );
        } );
    } );
    if ( weightedSteps.length === 0 )
        return null;
    var result = randomlyPickWeighted( weightedSteps );
    return result;
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
function plotFromJson( json ) {
    var plot = makePlot();
    _.arrEach( json.nodes, function ( node ) {
        plot = plot.plusNode( node );
    } );
    _.arrEach( json.steps, function ( step ) {
        plot = plot.plusStep( step );
    } );
    return plot;
}

var plotDevelopments = [];
function addPlotDevelopment( weight, plotDevelopment ) {
    plotDevelopments.push( { weight: weight, val: plotDevelopment } );
}

addPlotDevelopment( 1, function ( plot ) {
    // Add a beat to any step.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return null;
    var node = { type: "doNothing", name: gensym() };
    return plot.plusNode( node ).
        replaceStep( step, step.start, node.name, step.stop );
} );
addPlotDevelopment( 2, function ( plot ) {
    // Turn any step into a converging choice of two possible steps.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return null;
    var choiceName = gensym();
    var start =
        { type: "startChoice", name: gensym(), choice: choiceName,
            choiceMadeHere: true };
    var stop =
        { type: "stopChoice", name: gensym(), choice: choiceName };
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
        return null;
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
    // Add a fresh puzzle dependency to any step by foreshadowing it
    // and lampshading it all at once.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return null;
    var resource = gensym();
    var foreshadow = { type: "foreshadow", name: gensym(),
        resource: resource, bookend: null };
    var lampshade = { type: "lampshade", name: gensym(),
        resource: resource, bookend: null };
    return plot.plusNode( foreshadow, lampshade ).replaceStep( step,
        step.start, foreshadow.name, lampshade.name, step.stop );
} );
addPlotDevelopment( 3, function ( plot ) {
    // Add a non-consuming use to any foreshadowing.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return null;
    var foreshadowing = plot.getNode( step.start );
    if ( foreshadowing.type !== "foreshadow" )
        return null;
    
    var node = { type: "use", name: gensym(),
        resource: foreshadowing.resource };
    return plot.plusNode( node ).
        replaceStep( step, step.start, node.name, step.stop );
} );
function randomlyPickThreeSteps( plot ) {
    var midwayStep = plot.randomlyPickStep();
    if ( midwayStep === null )
        return null;
    var beforeNode = plot.getNode( midwayStep.start );
    var afterNode = plot.getNode( midwayStep.stop );
    var beforeStepCandidates = [];
    var afterStepCandidates = [];
    plot.eachStep( function ( step ) {
        if ( step.stop === beforeNode.name )
            beforeStepCandidates.push( step );
        if ( step.start === afterNode.name )
            afterStepCandidates.push( step );
    } );
    if ( beforeStepCandidates.length === 0 )
        return null;
    if ( afterStepCandidates.length === 0 )
        return null;
    var beforeStep = randomlyPickElement( beforeStepCandidates );
    var afterStep = randomlyPickElement( afterStepCandidates );
    
    var result = {};
    result.beforeStepCandidates = beforeStepCandidates;
    result.afterStepCandidates = afterStepCandidates;
    result.midwayStep = midwayStep;
    result.beforeStep = beforeStep;
    result.afterStep = afterStep;
    result.beforeNode = beforeNode;
    result.afterNode = afterNode;
    return result;
}
function specialCommutationIsAllowed( beforeNode, afterNode ) {
    
    // We explicitly avoid making changes that could cause a
    // `choiceMadeHere` node to gain more or less coverage over the
    // playthroughs. We do this just because a playthrough with more
    // or fewer than one `choiceMadeHere` node would be confusing for
    // the author.
    //
    // TODO: See if there's a way we can show the author which choices
    // should lead to which branches. That would make these cases less
    // confusing, and we might not need to disallow them anymore.
    //
    if (
        (afterNode.type === "startChoice"
            || afterNode.type === "startConcurrency")
        && beforeNode.type === "startChoice"
        && beforeNode.choiceMadeHere )
        return false;
    if (
        (beforeNode.type === "startChoice"
            || beforeNode.type === "startConcurrency")
        && afterNode.type === "startChoice"
        && afterNode.choiceMadeHere )
        return false;
    
    // We avoid making changes that would allow a "startChoice" node
    // to appear on a branch it wasn't originally on. (TODO: Actually,
    // I'm confused about the reason we need the "stopConcurrency"
    // cases, but they do seem to be needed.)
    if ( (afterNode.type === "stopChoice"
            || afterNode.type === "stopConcurrency")
        && beforeNode.type === "stopChoice" )
        return false;
    if ( (beforeNode.type === "stopChoice"
            || beforeNode.type === "stopConcurrency")
        && afterNode.type === "stopChoice" )
        return false;
    
    var beforeFamily = plotNodeFamily( beforeNode );
    var afterFamily = plotNodeFamily( afterNode );
    
    // We don't allow commutation across bookends.
    if ( beforeFamily === "foreshadow"
        && afterFamily === "foreshadow"
        && ((beforeNode.bookend !== null
                && beforeNode.bookend.val === afterNode.resource)
            || (afterNode.bookend !== null
                && afterNode.bookend.val === beforeNode.resource)) )
        return false;
    
    // We don't allow commutation that would let something be
    // foreshadowed more than once at a time.
    //
    // TODO: See if there's a safe way to can elimitate a lampshading
    // followed by a foreshadowing of the same resource.
    //
    if ( ((beforeNode.type === "lampshade"
                && afterNode.type === "foreshadow")
            || (beforeNode.type === "foreshadow"
                && afterNode.type === "lampshade"))
        && beforeNode.resource === afterNode.resource )
        return false;
    
    // We don't allow commutation that would let something be used
    // outside its foreshadowing range.
    if ( ((beforeFamily === "foreshadow"
                && afterNode.type === "use")
            || (afterFamily === "foreshadow"
                && beforeNode.type === "use"))
        && beforeNode.resource === afterNode.resource )
        return false;
    
    if ( afterNode.type === "foreshadow" )
        return randomlyDecide( 1 );
    else if ( beforeNode.type === "lampshade" )
        return randomlyDecide( 1 );
    else if ( afterNode.type === "startConcurrency"
        || afterNode.type === "startChoice" )
        return randomlyDecide( 0.8 );
    else if ( beforeNode.type === "stopConcurrency"
        || beforeNode.type === "stopChoice" )
        return randomlyDecide( 0.8 );
    else
        return randomlyDecide( 0.4 );
}
addPlotDevelopment( 30, function ( plot ) {
    // Pick an edge, and commute its two nodes in a way that
    // duplicates them over each other's branches.
    
    // * - b - a - *
    // * '       ` *
    // ->
    // * - a - b - *
    //       X
    // * - a - b - *
    
    // * ->- b ->- a ->- *
    //   ,-'        `->- *
    //   `->---------->- *
    // ->
    // * ->- a ->--- b ->- *
    //        `->-. /
    //             X
    //        ,-<-' \
    //    ,- a -<--- b ->- *
    //    `->----------->- *
    
    var threeSteps = randomlyPickThreeSteps( plot );
    if ( threeSteps === null )
        return null;
    var beforeNode = threeSteps.beforeNode;
    var afterNode = threeSteps.afterNode;
    var numberOfBeforeNextSteps = 0;
    var numberOfAfterPrevSteps = 0;
    plot.eachStep( function ( step ) {
        if ( step.start === beforeNode.name )
            numberOfBeforeNextSteps++;
        if ( step.stop === afterNode.name )
            numberOfAfterPrevSteps++;
    } );
    if ( numberOfBeforeNextSteps !== 1
        && numberOfAfterPrevSteps !== 1 )
        return null;
    var numberOfMidwaySteps =
        (threeSteps.beforeStepCandidates.length +
            numberOfBeforeNextSteps - 1) *
        (threeSteps.afterStepCandidates.length +
            numberOfAfterPrevSteps - 1);
    var midwayWeight =
        threeSteps.midwayStep.weight / numberOfMidwaySteps;
    
    function duplicateNode( node ) {
        if ( node.type === "startStory" )
            return { type: "startStory", name: gensym() };
        else if ( node.type === "stopStory" )
            return { type: "stopStory", name: gensym() };
        else if ( node.type === "startConcurrency" )
            return { type: "startConcurrency", name: gensym() };
        else if ( node.type === "stopConcurrency" )
            return { type: "stopConcurrency", name: gensym() };
        else if ( node.type === "startChoice" )
            return { type: "startChoice", name: gensym(),
                choice: node.choice,
                choiceMadeHere: node.choiceMadeHere };
        else if ( node.type === "stopChoice" )
            return { type: "stopChoice", name: gensym(),
                choice: node.choice };
        else if ( node.type === "foreshadow" )
            return { type: "foreshadow", name: gensym(),
                resource: node.resource, bookend: node.bookend };
        else if ( node.type === "lampshade" )
            return { type: "lampshade", name: gensym(),
                resource: node.resource, bookend: node.bookend };
        else if ( node.type === "doNothing" )
            return { type: "doNothing", name: gensym() };
        else if ( node.type === "use" )
            return { type: "use", name: gensym(),
                resource: node.resource };
        else
            throw new Error();
    }
    function reverseNode( node ) {
        // NOTE: This isn't as uncontroversial as it might look. In
        // particular, a `stopChoice` contains less information than a
        // `startChoice`, so this operation isn't perfectly involutive
        // there.
        
        if ( node.type === "startStory" )
            return { type: "stopStory", name: gensym() };
        else if ( node.type === "stopStory" )
            return { type: "startStory", name: gensym() };
        else if ( node.type === "startConcurrency" )
            return { type: "stopConcurrency", name: gensym() };
        else if ( node.type === "stopConcurrency" )
            return { type: "startConcurrency", name: gensym() };
        else if ( node.type === "startChoice" )
            return { type: "stopChoice", name: gensym(),
                choice: node.choice };
        else if ( node.type === "stopChoice" )
            return { type: "startChoice", name: gensym(),
                choice: node.choice, choiceMadeHere: false };
        else if ( node.type === "foreshadow" )
            return { type: "lampshade", name: gensym(),
                resource: node.resource, bookend: node.bookend };
        else if ( node.type === "lampshade" )
            return { type: "foreshadow", name: gensym(),
                resource: node.resource, bookend: node.bookend };
        else if ( node.type === "doNothing" )
            return { type: "doNothing", name: gensym() };
        else if ( node.type === "use" )
            return { type: "use", name: gensym(),
                resource: node.resource };
        else
            throw new Error();
    }
    
    function isOfTypePreparedForInThisRule( node ) {
        return node.type === "startStory" ||
            node.type === "stopStory" ||
            node.type === "startConcurrency" ||
            node.type === "stopConcurrency" ||
            node.type === "startChoice" ||
            node.type === "stopChoice" ||
            node.type === "foreshadow" ||
            node.type === "lampshade" ||
            node.type === "doNothing" ||
            node.type === "use";
    }
    if ( !isOfTypePreparedForInThisRule( beforeNode )
        || !isOfTypePreparedForInThisRule( afterNode ) )
        throw new Error();
    
    if ( plotNodeFamily( beforeNode ) === "story"
        || plotNodeFamily( afterNode ) === "story" )
        throw new Error();
    
    if ( !specialCommutationIsAllowed( beforeNode, afterNode ) )
        return null;
    
    var newPlot = plot;
    
    newPlot = newPlot.
        minusNodeName( beforeNode.name, afterNode.name ).
        minusStep( threeSteps.midwayStep );
    
    var afterDupeSources = [];
    var afterDupeSinks = [];
    var beforeDupeSinks = [];
    var beforeDupeSources = [];
    newPlot.eachStep( function ( step ) {
        if ( step.stop === beforeNode.name ) {
            if ( stepsEq( step, threeSteps.beforeStep ) ) {
                var afterDupe = afterNode;
            } else {
                var afterDupe = duplicateNode( afterNode );
                if ( afterDupe.type === "startChoice"
                    && beforeNode.type === "stopConcurrency" )
                    afterDupe.choiceMadeHere = false;
            }
            afterDupeSources.push( afterDupe );
            newPlot = newPlot.plusNode( afterDupe ).
                replaceStep( step, step.start, afterDupe.name );
        } else if ( step.start === beforeNode.name ) {
            var afterDupe = reverseNode( afterNode );
            afterDupeSinks.push( afterDupe );
            newPlot = newPlot.plusNode( afterDupe ).
                replaceStep( step, afterDupe.name, step.stop );
        } else if ( step.start === afterNode.name ) {
            if ( stepsEq( step, threeSteps.afterStep ) )
                var beforeDupe = beforeNode;
            else
                var beforeDupe = duplicateNode( beforeNode );
            beforeDupeSinks.push( beforeDupe );
            newPlot = newPlot.plusNode( beforeDupe ).
                replaceStep( step, beforeDupe.name, step.stop );
        } else if ( step.stop === afterNode.name ) {
            var beforeDupe = reverseNode( beforeNode );
            beforeDupeSources.push( beforeDupe );
            newPlot = newPlot.plusNode( beforeDupe ).
                replaceStep( step, step.start, beforeDupe.name );
        }
    } );
    
    _.arrEach( beforeDupeSources, function ( beforeDupe ) {
        _.arrEach( afterDupeSinks, function ( afterDupe ) {
            // NOTE: This shouldn't happen. It would have fallen under
            // the condition (numberOfBeforeNextSteps !== 1 &&
            // numberOfAfterPrevSteps !== 1) checked above.
            throw new Error();
        } );
    } );
    _.arrEach( beforeDupeSources, function ( beforeDupe ) {
        _.arrEach( afterDupeSources, function ( afterDupe ) {
            newPlot = newPlot.plusSteps( midwayWeight,
                beforeDupe.name, afterDupe.name );
        } );
    } );
    _.arrEach( beforeDupeSinks, function ( beforeDupe ) {
        _.arrEach( afterDupeSources, function ( afterDupe ) {
            // NOTE: This is the categorical dual of itself. When we
            // swap "before" and "after", swap "sinks" and "sources",
            // and swap the order of arguments to `plusSteps`, we get
            // just what we started with (except with the `arrEach`
            // calls in a different order).
            newPlot = newPlot.plusSteps( midwayWeight,
                afterDupe.name, beforeDupe.name );
        } );
    } );
    _.arrEach( beforeDupeSinks, function ( beforeDupe ) {
        _.arrEach( afterDupeSinks, function ( afterDupe ) {
            newPlot = newPlot.plusSteps( midwayWeight,
                beforeDupe.name, afterDupe.name );
        } );
    } );
    
    return newPlot;
} );
addPlotDevelopment( 30, function ( plot ) {
    // Pick an edge, and commute its two nodes in a way that preserves
    // all but one of each node's other connections.
    
    // * - b - a - *
    // * '       ` *
    // ->
    // * - a - b - *
    // * ---\-'
    //       `---- *
    
    // * - b - a - *
    //       \   ` *
    //        `--- *
    // ->
    // * - a - b - *
    //       `--\- *
    //           ` *
    
    // TODO: Figure out if we can easily support this case without
    // potentially creating a directed cycle.
    //
    // * - b - a - *
    //      `-/--- *
    // * ----'
    // ->
    // * - a - b - *
    // * '       ` *
    
    var threeSteps = randomlyPickThreeSteps( plot );
    if ( threeSteps === null )
        return null;
    var beforeNode = threeSteps.beforeNode;
    var afterNode = threeSteps.afterNode;
    var numberOfBeforeNextSteps = 0;
    var numberOfAfterPrevSteps = 0;
    plot.eachStep( function ( step ) {
        if ( step.start === beforeNode.name )
            numberOfBeforeNextSteps++;
        if ( step.stop === afterNode.name )
            numberOfAfterPrevSteps++;
    } );
    if ( numberOfBeforeNextSteps !== 1
        && numberOfAfterPrevSteps !== 1 )
        return null;
    
    function isOfTypePreparedForInThisRule( node ) {
        return node.type === "startStory" ||
            node.type === "stopStory" ||
            node.type === "startConcurrency" ||
            node.type === "stopConcurrency" ||
            node.type === "startChoice" ||
            node.type === "stopChoice" ||
            node.type === "foreshadow" ||
            node.type === "lampshade" ||
            node.type === "doNothing" ||
            node.type === "use";
    }
    if ( !isOfTypePreparedForInThisRule( beforeNode )
        || !isOfTypePreparedForInThisRule( afterNode ) )
        throw new Error();
    
    var beforeFamily = plotNodeFamily( beforeNode );
    var afterFamily = plotNodeFamily( afterNode );
    
    if ( beforeFamily === "story" || afterFamily === "story" )
        throw new Error();
    
    if ( (beforeFamily === "concurrency"
            && afterFamily === "choice")
        || (beforeFamily === "choice"
            && afterFamily === "concurrency")
        || (beforeFamily === "concurrency"
            && afterFamily === "foreshadow")
        || (beforeFamily === "foreshadow"
            && afterFamily === "concurrency")
        || (beforeFamily === "choice" && afterFamily === "foreshadow")
        || (beforeFamily === "foreshadow" && afterFamily === "choice")
        )
        return null;
    
    if ( !specialCommutationIsAllowed( beforeNode, afterNode ) )
        return null;
    
    return plot.
        replaceStep( threeSteps.midwayStep,
            afterNode.name, beforeNode.name ).
        replaceStep( threeSteps.beforeStep,
            threeSteps.beforeStep.start, afterNode.name ).
        replaceStep( threeSteps.afterStep,
            beforeNode.name, threeSteps.afterStep.stop );
} );

// TODO: Add rules for these:
/*
* Upgrade a puzzle dependency to connote access to one of the points of interest (not already picked this way).
* Upgrade a puzzle dependency to connote access to one of the characters' uses. (If the same character is picked multiple times, each one represents a different thing the character can do.)
* Associate a bookendless foreshadowing or a lampshading with another that is earlier or later, respectively, as long as the outer one connotes a point of interest or a character use. Now the outer one is the bookend of the inner one.
*/

addPlotDevelopment( 3, function ( plot ) {
    // Associate a bookendless lampshading with a later bookendless foreshadowing. Now they're bookends of each other.
    
    var step = plot.randomlyPickStep();
    if ( step === null )
        return null;
    var lampshading = plot.getNode( step.start );
    if ( lampshading.type !== "lampshade" )
        return null;
    var foreshadowing = plot.getNode( step.stop );
    if ( foreshadowing.type !== "foreshadow" )
        return null;
    
    return plot.minusNodeName( step.start, step.stop ).
        plusNode( { type: "lampshade", name: step.start,
            resource: lampshading.resource,
            bookend: { val: foreshadowing.resource } } ).
        plusNode( { type: "foreshadow", name: step.stop,
            resource: foreshadowing.resource,
            bookend: { val: lampshading.resource } } );
} );

// TODO: Implement this termination condition:
/*
When a sufficient number of character uses have been assigned on every branch, the generation is complete.
*/

// TODO: Decide whether to leave this debug state in here.
var debug_plotsSeen = [];
function randomlyPickPlot( options ) {
    
    //        ,------- * ----- *
    //       /       /
    // * - * - * - * - * ----- *
    //           \       \
    //            `------- * - *
    
    var choiceName1 = gensym();
    var choiceName3 = gensym();
    
    var stopChoice1 =
        { type: "stopChoice", name: gensym(), choice: choiceName1 };
    var stopStory1 = { type: "stopStory", name: gensym() };
    
    var startStory = { type: "startStory", name: gensym() };
    var startChoice1 =
        { type: "startChoice", name: gensym(), choice: choiceName1,
            choiceMadeHere: true };
    var startChoice2 =
        { type: "startChoice", name: gensym(), choice: choiceName3,
            choiceMadeHere: true };
    var startChoice3 =
        { type: "startChoice", name: gensym(), choice: gensym(),
            choiceMadeHere: true };
    var startChoice4 =
        { type: "startChoice", name: gensym(), choice: gensym(),
            choiceMadeHere: true };
    var stopStory2 = { type: "stopStory", name: gensym() };
    
    var stopChoice3 =
        { type: "stopChoice", name: gensym(), choice: choiceName3 };
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
    // above.
    debug_plotsSeen = [];
    debug_plotsSeen.push( plot );
    _.repeat( options.numberOfIterations, function () {
        do {
            var plotDevelopment =
                randomlyPickWeighted( plotDevelopments );
            var newPlot = plotDevelopment( plot );
        } while ( newPlot === null );
        plot = newPlot;
        debug_plotsSeen.push( plot );
    } );
    
    
    return plot;
}
