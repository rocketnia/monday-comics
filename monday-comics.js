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

function randomlyPickNat( max ) {
    if ( max === 0 )
        throw new Error();
    do {
        var i = Math.floor( Math.random() * max );
    } while ( i === max );
    return i;
}

function randomlyPickElement( arr ) {
    return arr[ randomlyPickNat( arr.length ) ];
}

// TODO: See if we even need this now that all our weights are 1 in
// practice.
function randomlyPickWeighted( arr ) {
    var n = arr.length;
    if ( n === 0 )
        throw new Error();
    var total = 0;
    _.arrEach( arr, function ( elem ) {
        total += elem.weight;
    } );
    var chosenWeight = randomlyPickNat( total );
    return _.arrAny( arr, function ( elem ) {
        if ( chosenWeight <= elem.weight )
            return { val: elem.val };
        chosenWeight -= elem.weight;
        return false;
    } ).val;
}

function randomlyPickCharacter( continuityData ) {
    return randomlyPickElement( continuityData.characters );
}

// Instead of picking a character at random and then picking one of
// its qualities, this picks among all characters' qualities and then
// use that to pick a character. That way the least interesting
// characters are picked less often.
function randomlyPickCharacterAndQuality( continuityData ) {
    return randomlyPickElement(
        _.arrMappend( continuityData.characters,
            function ( character ) {
            
            return _.arrMap( character.qualities,
                function ( quality ) {
                
                return { character: character, quality: quality };
            } );
        } ) );
}

function randomlyPickQuality( character ) {
    return randomlyPickElement( character.qualities );
}

var prompts = [];

// TODO: See what we should do when there are fewer than three
// characters or a character has fewer than two qualities. Right now
// the prompts may loop infinitely as they try to pick distinct
// entries.
function randomlyPickPrompt( continuityData ) {
    return randomlyPickWeighted( prompts )( continuityData );
}

function hasStringDuplicates( arr ) {
    var seen = {};
    return _.arrAny( arr, function ( str ) {
        var k = "|" + str;
        if ( _.hasOwn( seen, k ) )
            return true;
        seen[ k ] = true;
        return false;
    } );
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
    
    // NOTE: Right now all of the following behave very similarly, but
    // in general we might like different kinds of templates to have
    // different kinds of behavior.
    
    if ( /\[a\]/.test( prompt )
        && /\[having a detail\]/.test( prompt )
        && !/\[having another detail\]/.test( prompt )
        && /\[b\]/.test( prompt )
        && /\[c\]/.test( prompt ) ) {
        
        prompts.push( { weight: 1, val: function ( continuityData ) {
            do {
                var a =
                    randomlyPickCharacterAndQuality( continuityData );
                var charB = randomlyPickCharacter( continuityData );
                var charC = randomlyPickCharacter( continuityData );
            } while (
                hasStringDuplicates(
                    [ a.character.name, charB.name, charC.name ] ) );
            
            return replaceWith( {
                "a": a.character.name,
                "having a detail": a.quality,
                "b": charB.name,
                "c": charC.name
            } );
        } } );
        
    } else if ( /\[a\]/.test( prompt )
        && /\[having a detail\]/.test( prompt )
        && !/\[having another detail\]/.test( prompt )
        && /\[b\]/.test( prompt )
        && !/\[c\]/.test( prompt ) ) {
        
        prompts.push( { weight: 1, val: function ( continuityData ) {
            do {
                var a =
                    randomlyPickCharacterAndQuality( continuityData );
                var charB = randomlyPickCharacter( continuityData );
            } while ( a.character.name === charB.name );
            
            return replaceWith( {
                "a": a.character.name,
                "having a detail": a.quality,
                "b": charB.name
            } );
        } } );
        
    } else if ( /\[a\]/.test( prompt )
        && /\[having a detail\]/.test( prompt )
        && /\[having another detail\]/.test( prompt )
        && /\[b\]/.test( prompt )
        && !/\[c\]/.test( prompt ) ) {
        
        prompts.push( { weight: 1, val: function ( continuityData ) {
            do {
                var a =
                    randomlyPickCharacterAndQuality( continuityData );
                var charB = randomlyPickCharacter( continuityData );
                var havingAnotherQuality =
                    randomlyPickQuality( a.character );
            } while ( a.character.name === charB.name
                || a.quality === havingAnotherQuality );
            
            return replaceWith( {
                "a": a.character.name,
                "having a detail": a.quality,
                "having another detail": havingAnotherQuality,
                "b": charB.name
            } );
        } } );
    } else {
        throw new Error();
    }
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
        "vouches for [c]."
], function ( prompt ) {
    addDslPrompt( prompt );
} );
