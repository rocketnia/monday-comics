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

function randomlyPickQuality( character ) {
    return randomlyPickElement( character.qualities );
}

var prompts = [];

function randomlyPickPrompt( continuityData ) {
    return randomlyPickWeighted( prompts )( continuityData );
}

// The detail takes B by surprise. (1 configuration)
prompts.push( { weight: 1, val: function ( continuityData ) {
    do {
        var main = randomlyPickCharacter( continuityData );
        var foil = randomlyPickCharacter( continuityData );
        var havingQuality = randomlyPickQuality( main );
    } while ( main.name === foil.name );
    
    return "The fact of " + main.name + " " + havingQuality + " " +
        "takes " + foil.name + " by surprise.";
} } );

// B tries to use the detail to their advantage and either succeeds or
// fails. Maybe they fail because of another detail.
// (3 configurations)
prompts.push( { weight: 3, val: function ( continuityData ) {
    do {
        var main = randomlyPickCharacter( continuityData );
        var foil = randomlyPickCharacter( continuityData );
        var havingQuality = randomlyPickQuality( main );
        var havingAnotherQuality = randomlyPickQuality( main );
    } while ( main.name === foil.name
        || havingQuality === havingAnotherQuality );
    
    return foil.name + " tries to benefit from " + main.name + " " +
        havingQuality + ", " +
        randomlyPickElement( [
            "and the attempt succeeds.",
            "but the attempt fails.",
            "but the attempt fails because of " + main.name + " " +
                havingAnotherQuality + "."
        ] );
} } );

// B or A offers advice to or solicits advice from the other, in
// regard to that detail. (4 configurations)
prompts.push( { weight: 4, val: function ( continuityData ) {
    do {
        var main = randomlyPickCharacter( continuityData );
        var foil = randomlyPickCharacter( continuityData );
        var havingQuality = randomlyPickQuality( main );
    } while ( main.name === foil.name );
    
    return randomlyPickElement( [
        main.name + ", enthused with " + havingQuality + ", offers " +
            "advice to " + foil.name + ".",
        main.name + ", frustrated with " + havingQuality + ", " +
            "seeks advice from " + foil.name + ".",
        foil.name + " offers advice to " + main.name + " to deal " +
            "with " + havingQuality + ".",
        foil.name + " seeks advice from " + main.name + " on " +
            havingQuality + "."
    ] );
} } );

// They participate in a situation where the detail is surprisingly
// valuable or surprisingly challenging. (2 configurations)
prompts.push( { weight: 2, val: function ( continuityData ) {
    do {
        var main = randomlyPickCharacter( continuityData );
        var foil = randomlyPickCharacter( continuityData );
        var havingQuality = randomlyPickQuality( main );
    } while ( main.name === foil.name );
    
    return foil.name + " discovers a surprising " +
        randomlyPickElement( [ "benefit ", "drawback " ] ) + "in " +
        main.name + " " + havingQuality + ".";
} } );

// TODO: Add these prompts:
//
// To get back at B, A tries having a detail.
// To get back at A, B tries imitating A having a detail.
// B messes up, and A is in danger due to having a detail.
// B gossips with C about A having a detail.
// A disguises as B, but having a detail is a dead giveaway.
// B disguises as A, but C knows about A having a detail.
//
// Everyone suddenly copycats A in having a detail, but B doesn't
// follow along.
//
// A stops having a detail, and B gets worried.
//
// B comes up with a plan to amplify the innate power of A having a
// detail.
//
// B requires someone good at having a detail, and C volunteers A.
// B requires someone good at having a detail, and A vouches for C.
