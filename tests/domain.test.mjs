import test from 'node:test';
import assert from 'node:assert/strict';
import {compatibility} from '../src/domain/compatibility.mjs';
import {emailError, passwordPolicyError, passwordStrength, validateCredentials, validateSignup} from '../src/features/auth/validation.mjs';
import {compatibilityKickoff, COMPATIBILITY_RATING_TARGET} from '../src/domain/onboarding.mjs';
import {tasteGateDecision, tasteCompleteKey} from '../src/features/auth/gate-state.mjs';
import {genres, searchGenres, genresByCategory} from '../src/features/catalog/genres.mjs';
import {ambientOrbs} from '../src/design/motion.mjs';
import {pickSuggestions} from '../src/domain/friends-suggestions.mjs';
import {parseScore} from '../src/domain/rating.mjs';
test('ratings accept zero, ten and localized decimal scores',()=>{assert.equal(parseScore('0'),0);assert.equal(parseScore('10'),10);assert.equal(parseScore('8,5'),8.5);});
test('ratings reject missing, out of bounds or malformed values',()=>{for(const value of ['', ' ', '-1','11','8.55','Infinity','7abc'])assert.equal(parseScore(value),null);});
test('ratings handle boundaries and punctuation edge cases',()=>{assert.equal(parseScore('0.0'),0);assert.equal(parseScore('10.0'),10);assert.equal(parseScore(' 9.5 '),9.5);assert.equal(parseScore('10.1'),null);assert.equal(parseScore('5.'),null);assert.equal(parseScore('.5'),null);assert.equal(parseScore('00'),0);});
test('compatibility does not claim a percentage without sufficient common works',()=>assert.equal(compatibility([[10,10]]),null));
test('compatibility follows absolute rating differences',()=>assert.equal(compatibility([[10,9],[9,10],[8,8]],3),93));
test('opposite ratings yield zero',()=>assert.equal(compatibility(Array(5).fill([0,10])),0));
test('invalid ratings are rejected',()=>assert.throws(()=>compatibility([[NaN,5]],1),RangeError));
test('credentials reject malformed email and short passwords',()=>{assert.ok(validateCredentials('invalid','12345678'));assert.ok(validateCredentials('a@b.com','123'));assert.equal(validateCredentials('a@b.com','12345678'),null);});
test('emailError accepts valid addresses and rejects malformed ones',()=>{assert.equal(emailError('a@b.com'),null);assert.equal(emailError(' nome.sobrenome+tag@dominio.com.br '),null);for(const value of ['',' ','a','a@','a@b','@b.com','a b@c.com'])assert.ok(emailError(value));});

test('signup policy requires uppercase, number and symbol on top of length',()=>{assert.ok(passwordPolicyError('orbit-2026'));assert.ok(passwordPolicyError('Orbit2026'));assert.ok(passwordPolicyError('Orbit-ano'));assert.ok(passwordPolicyError('Or-26'));assert.equal(passwordPolicyError('Orbit-2026'),null);});

test('password strength is honest: weak until policy met, strong only with length',()=>{assert.equal(passwordStrength('orbit').level,'weak');assert.equal(passwordStrength('orbit-2026').level,'weak');assert.equal(passwordStrength('Orbit-2026').level,'medium');assert.equal(passwordStrength('Orbit-2026!x').level,'strong');});

test('signup validation enforces the new policy while login keeps the old one',()=>{assert.equal(validateCredentials('a@b.com','orbit-2026'),null);assert.ok(validateSignup('a@b.com','orbit-2026'));assert.equal(validateSignup('a@b.com','Orbit-2026'),null);assert.ok(validateSignup('a','Orbit-2026'));});

test('compatibility kickoff matches the compatibility minimum of 5 ratings',()=>{assert.equal(COMPATIBILITY_RATING_TARGET,5);assert.deepEqual(compatibilityKickoff(0),{remaining:5,complete:false});assert.deepEqual(compatibilityKickoff(4),{remaining:1,complete:false});assert.deepEqual(compatibilityKickoff(5),{remaining:0,complete:true});assert.deepEqual(compatibilityKickoff(9),{remaining:0,complete:true});assert.throws(()=>compatibilityKickoff(-1));assert.throws(()=>compatibilityKickoff(2.5));});

test('taste gate: guest browses, complete passes, incomplete goes to onboarding',()=>{assert.equal(tasteGateDecision(false,'error',false),'allow');assert.equal(tasteGateDecision(false,'incomplete',false),'allow');assert.equal(tasteGateDecision(true,'complete',false),'allow');assert.equal(tasteGateDecision(true,'incomplete',false),'onboard');assert.equal(tasteGateDecision(true,'incomplete',true),'onboard');});

test('taste gate on query failure: known complete falls back, unknown gets neutral retry',()=>{assert.equal(tasteGateDecision(true,'error',true),'allow');assert.equal(tasteGateDecision(true,'error',false),'retry');assert.throws(()=>tasteGateDecision(true,'bogus',false));});

test('taste completion record is per account and requires a user id',()=>{assert.notEqual(tasteCompleteKey('user-a'),tasteCompleteKey('user-b'));assert.ok(tasteCompleteKey('user-a').includes('user-a'));assert.throws(()=>tasteCompleteKey(''));});
test('genre search is accent and case insensitive and returns everything when empty',()=>{assert.equal(searchGenres('').length,genres.length);assert.equal(searchGenres('   ').length,genres.length);const terror=searchGenres('TERROR');assert.ok(terror.length>=3);assert.ok(terror.every(g=>g.label.toLowerCase().includes('terror')));const ficcao=searchGenres('ficcao');assert.ok(ficcao.some(g=>g.label==='Ficção científica'));assert.deepEqual(searchGenres('xyzzy-nada'),[]);});
test('genre ids are unique and every genre has a known category and label',()=>{const ids=new Set(genres.map(g=>g.id));assert.equal(ids.size,genres.length);const known=new Set(['film','series','anime','music','album','book','game']);for(const genre of genres){assert.ok(known.has(genre.category),genre.id);assert.ok(genre.label.length>0,genre.id);}});
test('genres group by category without losing entries',()=>{const groups=genresByCategory(genres);const total=[...groups.values()].reduce((sum,list)=>sum+list.length,0);assert.equal(total,genres.length);assert.ok(groups.get('music').length>0);assert.ok(groups.get('game').length>0);});
test('ambient background: no orbs under reduced motion, bounded drift otherwise',()=>{assert.deepEqual(ambientOrbs(true),[]);const orbs=ambientOrbs(false);assert.ok(orbs.length>=4&&orbs.length<=8);for(const orb of orbs){assert.ok(orb.size>0&&orb.duration>=5000);assert.ok(Math.abs(orb.dx)<=60&&Math.abs(orb.dy)<=60);assert.ok(orb.opacity>0&&orb.opacity<=1);}});
test('friend suggestions exclude self and any existing relation, respecting the limit',()=>{const me='u1';const profiles=[{id:'u1'},{id:'u2'},{id:'u3'},{id:'u4'},{id:'u5'},{id:'u6'},{id:'u7'}];const friendships=[{requester_id:'u1',addressee_id:'u2',status:'accepted'},{requester_id:'u4',addressee_id:'u1',status:'pending'}];const picked=pickSuggestions(profiles,friendships,me);assert.deepEqual(picked.map(p=>p.id),['u3','u5','u6','u7']);assert.deepEqual(pickSuggestions(profiles,friendships,me,2).map(p=>p.id),['u3','u5']);assert.deepEqual(pickSuggestions([],friendships,me),[]);});
