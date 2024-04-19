const scrollAbleContent = document.getElementById("scrollable-content");
const messageBtn = document.getElementById("sendButton");
const pdfBtn = document.getElementById("pdfBtn");
const logoutBtn = document.getElementById("logoutBtn");
const deleteBtn = document.getElementById("deleteBtn");
const inputField = document.getElementById("inputField");
const p2Elements = document.querySelectorAll(".p2_response");
const p3Elements = document.querySelectorAll(".p3");

// if (p2Elements.length > 0) {
//   p2Elements.forEach((element, index) => {
//     const value = element.textContent;
//     var synth = window.speechSynthesis;
//     var utterance = new SpeechSynthesisUtterance(value);
//     p3Elements[index].addEventListener("click", () => {
//       utterance.rate = 0.7;
//       synth.speak(utterance);
//     });
//   });
// }

// Function to disable the input field
const disableInputField = () => {
  inputField.disabled = true;
};

// Function to enable the input field
const enableInputField = () => {
  inputField.disabled = false;
};

const generatePdf = () => {
  var doc = new jsPDF();
  var html_content = $(".scrollable-content").html();
  specialElementHandlers = {
    "#editor": function (element, renderer) {
      return true;
    },
  };

  margins = {
    top: 15,
    bottom: 15,
    right: 15,
    left: 15,
  };

  doc.setTextColor(0, 0, 0);

  doc.fromHTML(html_content, margins.left, margins.top, {
    width: 180,
    elementHandlers: specialElementHandlers,
  });

  doc.save("chat.pdf");
};

const displayUserQuestion = (userQuestion) => {
  var userPromptDiv = document.createElement("div");
  userPromptDiv.id = "user-prompt";

  var p1Element = document.createElement("p");
  p1Element.className = "p1";
  p1Element.textContent = "You:";

  var p2Element = document.createElement("p");
  p2Element.className = "p2";
  p2Element.textContent = userQuestion;

  userPromptDiv.appendChild(p1Element);
  userPromptDiv.appendChild(p2Element);
  scrollAbleContent.appendChild(userPromptDiv);
};

const displayGptAnswer = (gptAnswer) => {
  disableInputField();
  // Create the div with id "response-display"
  var responseDisplayDiv = document.createElement("div");
  responseDisplayDiv.id = "response-display";

  // Create the first paragraph with class "p1"
  var p1Element = document.createElement("p");
  p1Element.className = "p1";
  p1Element.textContent = "GPT:";

  // Create the second paragraph with class "p2"
  var p2Element = document.createElement("p");
  p2Element.className = "p2";

  responseDisplayDiv.appendChild(p1Element);
  responseDisplayDiv.appendChild(p2Element);

  // Append the div to the body of the document
  scrollAbleContent.appendChild(responseDisplayDiv);

  // Split the response into individual letters
  const letters = gptAnswer.split("");

  // Function to display letters with a delay
  const displayLetterByLetter = (index) => {
    p2Element.textContent += letters[index];

    scrollAbleContent.scrollTop = scrollAbleContent.scrollHeight;

    // Check if there are more letters to display
    if (index < letters.length - 1) {
      // Schedule the next letter after a delay (e.g., 50 milliseconds)
      setTimeout(() => {
        displayLetterByLetter(index + 1);
      }, 20);
    } else {
      // All letters are displayed, now add the audio element
      //addAudioElement(gptAnswer, responseDisplayDiv);
      enableInputField();
    }
  };

  // Start displaying letters with a delay
  displayLetterByLetter(0);
};

// Function to add an audio element
const addAudioElement = (text, parentElement) => {
  // Use the Web Speech API to convert text to speech
  var synth = window.speechSynthesis;
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.7; // Speed of speech, 1 is the default

  // Append the audio element to the response display div
  var p3Element = document.createElement("p");
  p3Element.className = "p3";
  var playButton = document.createElement("i");
  playButton.className = "bi bi-play-circle";
  playButton.addEventListener("click", () => {
    synth.speak(utterance);
  });

  // Append the play button to the response display div
  p3Element.appendChild(playButton);
  parentElement.appendChild(p3Element);
};

function sendMessage() {
  var userInput = inputField.value;
  if (userInput == "") {
    alert("Please input value");
  } else {
    displayUserQuestion(userInput);

    //Send userInput to backend
    fetch("/process_input", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `user_input=${userInput}`,
    })
      .then((response) => response.json())
      .then((data) => {
        displayGptAnswer(data.response);
      })
      .catch((error) => console.error("Error:", error));

    // Clear the input field
    inputField.value = "";
  }
}

messageBtn.addEventListener("click", sendMessage);
inputField.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // Prevent the default behavior of the "Enter" key (form submission)
    e.preventDefault();
    sendMessage();
  }
});

pdfBtn.addEventListener("click", generatePdf);
logoutBtn.addEventListener("click", () => {
  // Send a request to the server to logout
  fetch("/logout", {
    method: "GET",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Redirect to the login page after successful logout
        window.location.href = "/";
      } else {
        console.error("Logout failed");
      }
    })
    .catch((error) => console.error("Error:", error));
});

// Add event listener for the delete button
deleteBtn.addEventListener("click", () => {
    // Display a confirmation dialog
    const confirmDelete = confirm("Are you sure you want to delete the chat history?");
    if (confirmDelete) {
        // User confirmed deletion, send AJAX request to delete chat history
        fetch("/delete_chat_history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Display a success message or update the UI as needed
                alert("Chat history deleted successfully.");
                // For example, you may want to clear the chat display on the frontend
                scrollAbleContent.innerHTML = ""; // Clear chat display
            } else {
                alert("Failed to delete chat history.");
            }
        })
        .catch(error => console.error("Error:", error));
    }
    // If the user cancels, do nothing
});

