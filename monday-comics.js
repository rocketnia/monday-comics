// monday-comics.js
// Copyright 2015 Ross Angle. Released under the MIT License.
//
// I'm thinking of developing a casual habit on Sunday nights: Write a
// tiny self-contained celebration of some characters I like, thus
// giving myself a sense of accomplishment and a clean palette for the
// approaching work week. Since writer's block would only have the
// opposite effect, I'm making a procedural generator of writing
// prompts.

"use strict";

// NOTE: Currently, all the generators we use are set up so that they
// can select uniformly between every possible outcome if
// completelyUniformDistribution here is set to true. However, to
// implement this we actually have to keep track of how many possible
// outcomes there are in order to do appropriate weighting. This seems
// to be staying safely within the range of a JavaScript number, but
// if it gets particularly large we might need to reconsider
// supporting this at all.
//
// Right now we have it set to false because a fully uniform
// distribution strongly favors prompts that have more blanks in
// them, and that makes those templates sound stale fast.
//
// We do at least use a fully uniform distribution for inserting
// characters and their qualities into a given prompt. This makes it
// so that the characters with the greatest number of interesting
// qualities appear the most often.
//
var completelyUniformDistribution = false;


function arrWithoutIndex( arr, i ) {
    var result = arr.slice();
    result.splice( i, 1 );
    return result;
}

function Generator() {}
Generator.prototype.init = function ( weight, generate ) {
    this.weight = weight;
    this.generate = generate;
    return this;
};

function randomlyPickDouble( max ) {
    if ( max <= 0 )
        throw new Error();
    do { var result = Math.random() * max; } while ( result === max );
    return result;
}

function randomlyPickNat( max ) {
    return Math.floor( randomlyPickDouble( max ) );
}

function randomlyPickWeighted( arr ) {
    var n = arr.length;
    if ( n === 0 )
        throw new Error();
    var total = 0;
    _.arrEach( arr, function ( elem ) {
        total += elem.weight;
    } );
    var chosenWeight = randomlyPickDouble( total );
    return _.arrAny( arr, function ( elem ) {
        if ( chosenWeight <= elem.weight )
            return { val: elem.val };
        chosenWeight -= elem.weight;
        return false;
    } ).val;
}

function generatorWrap( result ) {
    return new Generator().init( 1, _.kfn( result ) );
};

function generatorJoin( generators ) {
    var weight = 0;
    var weightedArr = _.arrMap( generators, function ( generator ) {
        weight += generator.weight;
        return { weight: generator.weight, val: generator };
    } );
    return new Generator().init( weight, function () {
        return randomlyPickWeighted( weightedArr ).generate();
    } );
}

function generatorMap( generator, func ) {
    return new Generator().init( generator.weight, function () {
        return func( generator.generate() );
    } );
}

function generatorOfElement( elements ) {
    return generatorJoin( _.arrMap( elements,
        function ( element, i ) {
        
        return generatorWrap( {
            chosen: element,
            remaining: arrWithoutIndex( elements, i )
        } );
    } ) );
}

function numberOfPermutations( numItems, numSelected ) {
    if ( numItems < numSelected )
        return 0;
    var result = 1;
    for ( var i = 0; i < numSelected; i++ )
        result *= numItems - i;
    return result;
}

function generatorOfDistinctElements( elements, n ) {
    return new Generator().init(
        numberOfPermutations( elements.length, n ),
        function () {
        
        var elementsRemaining = elements.slice();
        var results = [];
        for ( var i = 0; i < n; i++ ) {
            var resultI = randomlyPickNat( elementsRemaining.length );
            results.push( elementsRemaining[ resultI ] );
            // Remove the element from the elements remaining.
            arrWithoutIndex( elementsRemaining, resultI );
        }
        return { chosen: results, remaining: elementsRemaining };
    } );
}

function generatorOfCharacter( continuityData ) {
    return generatorOfElement( continuityData.characters );
}

function generatorOfCharacterAndQualities(
    continuityData, numQualities ) {
    
    return generatorJoin( _.arrMap( continuityData.characters,
        function ( character, i ) {
        
        var characterAndRemaining = {
            chosen: character,
            remaining: arrWithoutIndex( continuityData.characters, i )
        };
        
        return generatorMap(
            generatorOfDistinctElements(
                character.qualities, numQualities ),
            function ( qualities ) {
            
            return {
                character: characterAndRemaining,
                qualities: qualities
            };
        } );
    } ) );
}

var prompts = [];

function generatorOfPrompt( continuityData ) {
    return generatorJoin( _.arrMap( prompts, function ( prompt ) {
        return prompt( continuityData );
    } ) );
}

function addDslPrompt( prompt ) {
    function replaceWith( insertions ) {
        return prompt.replace( /\[([ a-z]*)\]/g,
            function ( keywordAndBrackets, keyword ) {
            
            if ( !_.hasOwn( insertions, keyword ) )
                throw new Error();
            return insertions[ keyword ];
        } );
    }
    
    prompts.push( function ( continuityData ) {
        var genCharacter = generatorOfCharacter( continuityData );
        var genCharacterAndQuality =
            generatorOfCharacterAndQualities( continuityData, 1 );
        var genCharacterAndTwoQualities =
            generatorOfCharacterAndQualities( continuityData, 2 );
        
        // NOTE: Right now all of the following behave very similarly,
        // but in general we might like different kinds of templates
        // to have different kinds of behavior.
        
        if ( /\[a\]/.test( prompt )
            && /\[having a detail\]/.test( prompt )
            && !/\[having another detail\]/.test( prompt )
            && /\[b\]/.test( prompt )
            && /\[c\]/.test( prompt ) ) {
            
            return new Generator().init(
                completelyUniformDistribution ?
                    genCharacterAndQuality.weight *
                        (genCharacter.weight - 1) *
                        (genCharacter.weight - 2) :
                    1,
                function () {
                
                var a = genCharacterAndQuality.generate();
                var charB = generatorOfElement(
                    a.character.remaining ).generate();
                var charC = generatorOfElement(
                    charB.remaining ).generate();
                
                return replaceWith( {
                    "a": a.character.chosen.name,
                    "having a detail": a.qualities.chosen[ 0 ],
                    "b": charB.chosen.name,
                    "c": charC.chosen.name
                } );
            } );
            
        } else if ( /\[a\]/.test( prompt )
            && /\[having a detail\]/.test( prompt )
            && !/\[having another detail\]/.test( prompt )
            && /\[b\]/.test( prompt )
            && !/\[c\]/.test( prompt ) ) {
            
            return new Generator().init(
                completelyUniformDistribution ?
                    genCharacterAndQuality.weight *
                        (genCharacter.weight - 1) :
                    1,
                function () {
                
                var a = genCharacterAndQuality.generate();
                var charB = generatorOfElement(
                    a.character.remaining ).generate();
                
                return replaceWith( {
                    "a": a.character.chosen.name,
                    "having a detail": a.qualities.chosen[ 0 ],
                    "b": charB.chosen.name
                } );
            } );
            
        } else if ( /\[a\]/.test( prompt )
            && /\[having a detail\]/.test( prompt )
            && /\[having another detail\]/.test( prompt )
            && /\[b\]/.test( prompt )
            && !/\[c\]/.test( prompt ) ) {
            
            return new Generator().init(
                completelyUniformDistribution ?
                    genCharacterAndTwoQualities.weight *
                        (genCharacter.weight - 1) :
                    1,
                function () {
                
                var a = genCharacterAndTwoQualities.generate();
                var charB = generatorOfElement(
                    a.character.remaining ).generate();
                
                return replaceWith( {
                    "a": a.character.chosen.name,
                    "having a detail": a.qualities.chosen[ 0 ],
                    "having another detail": a.qualities.chosen[ 1 ],
                    "b": charB.chosen.name
                } );
            } );
        } else {
            throw new Error();
        }
    } );
}

_.arrEach( [
    "The fact of [a] [having a detail] takes [b] by surprise.",
    "[b] tries to benefit from [a] [having a detail], and the " +
        "attempt succeeds.",
    "[b] tries to benefit from [a] [having a detail], but the " +
        "attempt fails.",
    "[b] tries to benefit from [a] [having a detail], but the " +
        "attempt fails because of [a] [having another detail].",
    "[a], enthused with [having a detail], offers advice to [b].",
    "[a], frustrated with [having a detail], seeks advice from [b].",
    "[b] offers advice to [a] to deal with [having a detail].",
    "[b] seeks advice from [a] on [having a detail].",
    "[b] discovers a surprising benefit in [a] [having a detail].",
    "[b] discovers a surprising drawback in [a] [having a detail].",
    "To get back at [b], [a] tries [having a detail].",
    "To get back at [a], [b] tries imitating [a] [having a detail].",
    "[b] messes up, and [a] is in danger due to [having a detail].",
    "[b] gossips with [c] about [a] [having a detail].",
    "[a] goes in disguise as [b] but keeps accidentally " +
        "[having a detail].",
    "[b] goes in disguise as [a], but [c] won't believe it without " +
        "\"[a]\" [having a detail].",
    "Everyone suddenly copycats [a] in [having a detail], but [b] " +
        "doesn't follow along.",
    "[a] stops [having a detail], and [b] gets worried.",
    "[b] comes up with a plan to amplify the innate power of [a] " +
        "[having a detail].",
    "[b] requires someone good at [having a detail], and [c] " +
        "volunteers [a].",
    "[b] requires someone good at [having a detail], and [a] " +
        "vouches for [c].",
    "A catastrophe must be averted by [a] [having a detail], " +
        "but only [b] is aware of the danger."
], function ( prompt ) {
    addDslPrompt( prompt );
} );
