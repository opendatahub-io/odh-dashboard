"use strict";


var expect = require('expect');

// Demo sample check (to get the response hello)
let fastify = require("../check");

const Fastify = require('fastify')
const App = require('../app')

//console.log(fastify)

const fp = require('fastify-plugin');
const Kube = require('../plugins/kube')
const { assert } = require('chai');

describe('Tasks API', () => {

    /**
     * Test the GET Route
     */
    describe("GET /hello", () =>{
        it("It should get the list of components", async () => {
            const response = await fastify.inject({
              method: 'GET',
              url: '/hello'
            });
            //expect(response.statusCode).to.have.status(200);
            expect(response.statusCode).toEqual(200);
            //done();
            })
        })

    describe("App works standalone", () =>{
        it("Registering app.js - ", async () => {
            const fastify = Fastify()
            fastify.register(App)
            await fastify.ready()
            assert.equal(true,true);
            })
        })   
    
    describe("Kube works standalone", () =>{
        it("Registering kube.js - ", async () => {
            const fastify = Fastify()
            fastify.register(Kube)
            await fastify.ready()
            assert.equal(true,true);
            })
        })    
    describe("Checking Kube response", () =>{
        it("Registering kube.js - ", async () => {
            const fastify = Fastify();
            fastify.register(fp(App),{})
            
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/status'
              });
            
            expect(response.statusCode).toEqual(200);  
            })
        })    
    })
