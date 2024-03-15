const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

const allEvents = [];
let eventdiff = [];

// Recursive function to calculate time difference and append to each object

// eslint-disable-next-line require-jsdoc
function calculateTimeDifference(lineHeight, timestamp1, timestamp2) {
  // eslint-disable-next-line max-len
  const difference = Math.abs(lineHeight*((timestamp1 - timestamp2)/timestamp1));
  return difference;
}

// eslint-disable-next-line require-jsdoc
function calculateAndAppendTimeDifference(objects, index = 0) {
  if (index === 0) {
    objects[index].line_height = 2; // First object has no previous timestamp
  } else {
    const previousLineheight=objects[index - 1].line_height;
    const previousTime = objects[index - 1].timestamp;
    const currentTime = objects[index].timestamp;
    // eslint-disable-next-line max-len
    const timeDifference = calculateTimeDifference(previousLineheight, currentTime, previousTime);
    objects[index].line_height = timeDifference;
  }

  if (index === objects.length - 1) {
    return objects;
  }
  return calculateAndAppendTimeDifference(objects, index + 1);
}

exports.diffCalcFB = functions.https.onRequest((req, res) => {
  const db = admin.firestore();
  const user = req.body.userId;

  // eslint-disable-next-line max-len
  db.collection("event_records").where("user", "==", user).orderBy("timestamp", "asc").get()
      .then((snapshot) => {
        snapshot.forEach((doc) => {
          const event = {
            "id": doc.id,
            "title": doc.data().title,
            "timestamp": doc.data().timestamp,
            "line_height": doc.data().line_height,
          };
          allEvents.push(event); // Use push instead of concat
        });
        eventdiff = calculateAndAppendTimeDifference(allEvents);

        const batch = db.batch();
        eventdiff.forEach((obj) => {
          const docRef = db.collection("event_records").doc(obj.id);
          batch.update(docRef, {line_height: obj.line_height});
        });

        return batch.commit(); // Return the batch commit promise
      })
      .then(() => {
        // eslint-disable-next-line max-len
        res.send(eventdiff); // Send the response after all operations are completed
        console.log("Batch update successful!");
      })
      .catch((error) => {
        console.error("Error updating documents: ", error);
        res.status(500).send("Error updating documents");
      });
});
