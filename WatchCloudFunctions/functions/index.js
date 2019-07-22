const functions = require('firebase-functions');
const admin = require('firebase-admin')
admin.initializeApp()
const stripe = require('stripe')(functions.config().stripe.public_test_key)


exports.createStripeCustomer = functions.firestore.document('users/{id}').onCreate(async (snap, context) => {
    const data = snap.data()
    const email = data.email

    const customer = await stripe.customers.create({ email: email })
    return admin.firestore().collection('users').doc(data.id).update({ stripeId: customer.id })
})

exports.createEphemeralKey = functions.https.onCall(async (data, context) => {
    const customerId = data.customer_id;
    const stripeVersion = data.stripe_version;
    const uid = context.auth.uid;

    if (uid === null) {
        console.log('Illegal access attempt due to unauthenticated user');
        throw new functions.https.HttpsError('permission-denied', 'Illegal access attempt.');
    }

    return stripe.ephemeralKeys.create(
        {customer: customerId},
        {stripe_version: stripeVersion}
    ).then((key) => {
        return key;
    }).catch((error) => {
        console.log(error);
        throw new functions.https.HttpsError('internal', 'Unable to create ephemeral key.');
    });
})

exports.createCharge = functions.https.onCall(async (data, context) => {
    const customerId = data.customerId;
    const totalAmount = data.total;
    const idempotency = data.idempotency;
    const uid = context.auth.uid;

    if (uid === null) {
        console.log('Illegal access attempt due to unauthenticated user');
        throw new functions.https.HttpsError('permission-denied', 'Illegal access attempt.');
    }

    return stripe.charges.create({
        amount: totalAmount,
        currency: 'aud',
        customer: customerId
    }, {
        idempotency_key: idempotency
    }).then( _ => {
        return
    }).catch( error => {
        console.log(error);
        throw new functions.https.HttpsError('internal', 'Unable to create charge')
    });

});
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
