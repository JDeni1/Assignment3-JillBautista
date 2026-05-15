/* Difficulty settings */
const DIFFICULTIES = {
  easy:   { pairs: 3,  time: 60  },
  medium: { pairs: 6,  time: 90  },
  hard:   { pairs: 10, time: 120 },
}

/* Game variables */
let firstCard   = undefined
let secondCard  = undefined
let lockBoard   = false

let numClicks   = 0
let numMatched  = 0
let totalPairs  = 0
let timeLeft    = 0
let timerID     = undefined
let gameStarted = false

let difficulty  = "easy"
let peekUsed    = false


/* Status bar */
function updateStatus () {
  $("#num_clicks").text(numClicks)
  $("#num_matched").text(numMatched)
  $("#num_left").text(totalPairs - numMatched)
  $("#num_total").text(totalPairs)
}

function updateTimer () {
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0")
  const secs = String(timeLeft % 60).padStart(2, "0")
  $("#time_left").text(mins + ":" + secs).toggleClass("warning", timeLeft <= 10)
}


/* Timer */
function startTimer () {
  clearInterval(timerID)
  updateTimer()
  timerID = setInterval(function () {
    timeLeft--
    updateTimer()
    if (timeLeft <= 0) {
      clearInterval(timerID)
      endGame(false)
    }
  }, 1000)
}

function stopTimer () {
  clearInterval(timerID)
}


/* Fetch pokemon from API */
async function getRandomPokemon (numPairs) {
  const res  = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025")
  const data = await res.json()

  const picked = data.results
    .sort(() => Math.random() - 0.5)
    .slice(0, numPairs)

  return Promise.all(picked.map(async function (p) {
    const d = await (await fetch(p.url)).json()
    return { name: d.name, img: d.sprites.other["official-artwork"].front_default }
  }))
}


/* Build cards */
function buildCards (pokemonList) {
  ;[...pokemonList, ...pokemonList]
    .sort(() => Math.random() - 0.5)
    .forEach(function (p) {
      $("#game_grid").append(`
        <div class="card">
          <img class="front_face" src="${p.img}" alt="${p.name}" id="${p.name}_${Math.random()}">
          <img class="back_face"  src="back.webp" alt="card back">
        </div>
      `)
    })

  $(".card").on("click", function () { flipCard($(this)) })
}


/* Flip card logic */
function flipCard ($card) {
  if (lockBoard || !gameStarted)  return
  if ($card.hasClass("matched"))  return
  if ($card.hasClass("flip"))     return

  numClicks++
  updateStatus()
  $card.addClass("flip")
  lockBoard = true           // lock immediately so no 3rd is pressed 

  if (!firstCard) {
    firstCard = $card.find(".front_face")[0]
    lockBoard = false         // unlock
    return
  }

  secondCard = $card.find(".front_face")[0]
  // lockBoard stays true while evaluating

  if (firstCard.src === secondCard.src) {
    // match 
    cardOf(firstCard).add(cardOf(secondCard)).addClass("matched").off("click")
    numMatched++
    updateStatus()
    firstCard  = undefined
    secondCard = undefined
    lockBoard  = false
    if (numMatched === totalPairs) {
      stopTimer()
      setTimeout(function () { endGame(true) }, 300)
    }
  } else {
    // no match 
    const a = firstCard
    const b = secondCard
    firstCard  = undefined
    secondCard = undefined
    setTimeout(function () {
      cardOf(a).removeClass("flip")
      cardOf(b).removeClass("flip")
      lockBoard = false       // unlock only AFTER cards have flipped back
    }, 1000)
  }
}

/* Returns the card div that has the back of pokeball*/
function cardOf (face) {
  return $("#" + face.id).parent()
}


/* End game */
function endGame (won) {
  gameStarted = false
  $("#btn_peek").prop("disabled", true)

  if (won) {
    showMessage("You Win! " + numClicks + " clicks — " + totalPairs + " pairs matched!", "win")
  } else {
    lockBoard = true
    $(".card:not(.matched)").addClass("flip").off("click")
    setTimeout(function () { showMessage("Game Over! Time ran out.", "lose") }, 800)
  }
}

function showMessage (text, type) {
  $("#message").removeClass("win lose").text(text)
  if (type) $("#message").addClass(type)
}


/* Start game */
async function startGame () {
  resetGame()

  const cfg   = DIFFICULTIES[difficulty]
  gameStarted = true
  totalPairs  = cfg.pairs
  timeLeft    = cfg.time
  peekUsed    = false

  updateStatus()
  updateTimer()
  $("#game_grid").toggleClass("hard", difficulty === "hard")
  $("#btn_peek").prop("disabled", false).text("Peek")
  $("#game_grid").html("<p style='padding:20px;color:#888'>Loading Pokemon...</p>")

  try {
    const pokemon = await getRandomPokemon(totalPairs)
    $("#game_grid").empty()
    buildCards(pokemon)
    startTimer()
  } catch (e) {
    $("#game_grid").html("<p style='padding:20px;color:tomato'>Failed to load. Check connection.</p>")
    gameStarted = false
  }
}


/* Reset game */
function resetGame () {
  stopTimer()
  gameStarted = numClicks = numMatched = totalPairs = timeLeft = 0
  firstCard   = secondCard = undefined
  lockBoard   = peekUsed = false

  $("#game_grid").empty().removeClass("hard")
  $("#time_left").text("--:--").removeClass("warning")
  $("#btn_peek").prop("disabled", true).text("Peek")
  showMessage("", "")
  updateStatus()
}


/* Peek power-up */
function activatePeek () {
  if (peekUsed || !gameStarted) return

  peekUsed = true
  $("#btn_peek").prop("disabled", true)

  const $hidden = $(".card:not(.matched):not(.flip)").addClass("flip")

  let count = 3
  const id = setInterval(function () {
    count--
    $("#btn_peek").text(count > 0 ? "Peek (" + count + "s)" : "Peek used")
    if (count <= 0) {
      clearInterval(id)
      $hidden.not(".matched").removeClass("flip")
    }
  }, 1000)
}


/* Theme */
function setTheme (theme) {
  $("body").toggleClass("dark", theme === "dark")
  $(".theme_btn").removeClass("active")
  $("#btn_" + theme).addClass("active")
}


/* Difficulty */
function setDifficulty (d) {
  difficulty = d
  $(".diff_btn").removeClass("active")
  $("#btn_" + d).addClass("active")
  if (gameStarted) startGame()
}


/* Document ready */
$(document).ready(function () {

  Object.keys(DIFFICULTIES).forEach(function (d) {
    $("#btn_" + d).on("click", function () { setDifficulty(d) })
  })

  ;["light", "dark"].forEach(function (t) {
    $("#btn_" + t).on("click", function () { setTheme(t) })
  })

  $("#btn_start").on("click", startGame)
  $("#btn_reset").on("click", resetGame)
  $("#btn_peek").on("click",  activatePeek)

  updateStatus()
})