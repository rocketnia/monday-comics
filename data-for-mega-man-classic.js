// data-for-mega-man-classic.js (part of Monday Comics)
// Copyright 2015 Ross Angle. Released under the MIT License.
//
// The Mega Man series and the characters therein are trademarks of
// Capcom. They are used here with the intention to provide parody and
// literary analysis.

"use strict";

var dataForMegaManClassic = (function () {


var characters = [];

characters.push( { name: "Dr. Wily", qualities: [
    "building robots",
    "reprogramming stolen technology",
    "pretending to be good",
    "taking over the world",
    "designing hostile architecture",
    "bragging"
] } );

characters.push( { name: "Dr. Light", qualities: [
    "building robots",
    "raising a robot family",
    "sharing research",
    "studying ecological and emotional networks",
    "worrying about Proto Man",
    "installing capsules all over the world"
] } );

characters.push( { name: "Mega Man", qualities: [
    "assisting in a lab",
    "wearing blue",
    "taking robots' powers",
    "defending the world",
    "navigating hostile facilities",
    "summoning Rush"
] } );

characters.push( { name: "Proto Man", qualities: [
    "finding his own way to get repaired",
    "wearing mysterious clothing",
    "stalking Mega Man",
    "whistling",
    "forging questionable alliances"
] } );

characters.push( { name: "Roll", qualities: [
    "keeping house",
    "wearing outfits",
    "assisting in a lab",
    "dealing with Robot Master admirers",
    "supplying equipment for Mega Man"
] } );

characters.push( { name: "Bass", qualities: [
    "fighting Mega Man",
    "brooding",
    "combining with Treble",
    "proving himself to Dr. Wily",
    "insulting Robot Masters",
    "becoming more powerful"
] } );

characters.push( { name: "Metool", qualities: [
    "working in groups",
    "hiding under a helmet",
    "swimming",
    "operating worksite machinery"
] } );

return {
    characters: characters
};


})();
