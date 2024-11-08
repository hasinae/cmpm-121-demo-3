// todo

const button = document.createElement("button");
button.textContent = "Click me!";

button.addEventListener("click", () => {
  alert("alert('you clicked the button!')");
});

document.body.appendChild(button);
