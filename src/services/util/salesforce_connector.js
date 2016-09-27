'use strict';

/* eslint-disable */

/**
 * Created by sseedorf on 12/05/16.
 */


//TODO: BEFORE PRODUCTION IMPLEMENT CACHING
    // REASON: Limited API calls

//TODO: (1.) Auto session renewal
// NOTE: This implementation uses default SOAP option
// OAuth 2 seems the better option since it allows refreshing the login
// -->Connect with Amir Z. on Oauth 2 credentials for ${artifactId}

// TODO: (2.) Test concurrent logins
// Question: Are parallel logins with the same credentials possible? What is the limit?
// ${artifactId} will run on at least 8 nodes (3 server zones + QA)

// TODO: (3.) Scheduler for resetting __maxLoginRetries, e.g. every 24 hours
// NOTE: Only required if OAuth 2.0 and auto renewal cannot be used

//TODO: (4.) SalesForce logout

const config = require('./../../base/config');
const logger = require('./../../base/logger')('salesForceController');
const jsforce = require('jsforce');
const _ = require('underscore');

let sfConn = new jsforce.Connection({
    loginUrl: config.get('salesforce:loginUrl')
});

const sfLogin = () => {
    try {
        if (sfConn.__loginRetries++ < sfConn.__maxLoginRetries) {
            sfConn.login(config.get('salesforce:username'), config.get('salesforce:password') +
                config.get('salesforce:securityToken'),
                (err, userInfo) => {
                    if (!err) {
                        logger.info('User ' + userInfo.id + ' successfully logged into Salesforce');
                        sfConn.__ready = true;
                    } else {
                        logger.error('Login failed to '+config.get('salesforce:loginUrl'));
                    }
                }
            );
        }
        return;
   } catch (error) {
        logger.error(error);
    }
}

// define our own variables
sfConn.__ready = false;
sfConn.__loginRetries = 0;
sfConn.__maxLoginRetries = 20;
// perform initial login to SalesForce

sfLogin();

const connect = () => {
    return new Promise((resolve, reject) => {
        if (sfConn.__ready) {
            resolve(sfConn);
        } else {
            reject(new Error('Salesforce connector is not ready. Abort.'));
            sfLogin();
        }
    });
}

const query = (queryString) => {
    return connect().then((sfConn) => {
            logger.debug(`New SalesForce query: ${queryString}`);
            return sfConn.query(queryString);
    }).then((response) => {
            return response;
        }, (err) => {
            // reconnect if automatically logged out
            if (err.name == 'INVALID_SESSION_ID'){
               logger.error('SalesForce INVALID_SESSION_ID. Trying to reconnect.');
               sfConn.__ready = false;
               sfLogin();
            } else {
                logger.error(`SalesForce query failed: ${err.message}`);
            }
        }
    );
};

const self = module.exports = {

    getCompany : (accountId) => {
        const queryString = `SELECT Name FROM Account WHERE LPSiteID1__c = '${accountId}'`;
        return query(queryString);
    },

    getWebsite : (accountId) => {
        const queryString = `SELECT Website FROM Account WHERE LPSiteID1__c = '${accountId}'`;
        return query(queryString);
    },

    getCompanyAndWebsite : (accountId) => {
        const queryString = `SELECT Name, Website FROM Account WHERE LPSiteID1__c = '${accountId}'`;
        return query(queryString);
    },

    isSupportTier2 : (accountId) => {
        const queryString = `SELECT Direct_Tier_2__c FROM Entitlement WHERE Status = 'Active' AND AccountId in (SELECT Id FROM Account WHERE LPSiteID1__c = '${accountId}')`;
        return query(queryString);
    },

    // NOTE: Several SalesForce API queries with the same subject are not efficient, combine into one query if possible
    getAccountInfo : (accountId) => {
        // test production account id
        // accountId = '2437025';
        //return Promise.all([self.getCompany(accountId),self.getWebsite(accountId), self.isSupportTier2(accountId)])
        return Promise.all([self.getCompanyAndWebsite(accountId)])
            .then((responses) => {
                logger.debug(responses);
                return {company: _.compact(_.pluck(responses[0].records, 'Name')),
                        website: _.compact(_.pluck(responses[0].records, 'Website'))};
            });
    }

}
