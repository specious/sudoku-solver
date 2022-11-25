#!/usr/bin/env node

// Turn on console output
let VV = false

// Verbose debugging information
let DD = false

let input = [
 ['.','.','6', '4','8','1', '3','.','.']
,['.','2','.', '.','.','.', '.','4','.']
,['7','.','.', '.','.','.', '.','.','9']

,['8','.','.', '.','9','.', '.','.','4']
,['6','.','.', '3','4','2', '.','.','1']
,['5','.','.', '.','6','.', '.','.','2']

,['3','.','.', '.','.','.', '.','.','5']
,['.','9','.', '.','.','.', '.','7','.']
,['.','.','5', '7','1','6', '2','.','.']
]

if (solveSudoku(input)) {
  console.log("Solution:\n")
  printBoard(input, 2)
} else {
  console.info("Puzzle not solved:\n")
  printBoard(input)
}

// Solves recursively and returns true if solved, false if dead end
function solveSudoku(board) {
  let rows = [], cols = [], blocks = []

if(DD) console.log("solving sudoku")

  //
  // Internal count of remaining possible cell value references (includes duplicates)
  //
  // Keeping track of this to catch the moment when it reaches 0 again, which means the
  // board has been solved
  //
  let stats = {
    vals: 0
  }

  //
  // Generate index (based on the original board) of values left to insert, indexed by row, column and block
  //
  for (let i = 0; i < 9; i++) {
    rows.push(
      remaining(board[i].filter(x => x !== '.'), stats)
    )
    cols.push(
      remaining(column(board, i), stats)
    )
    blocks.push(
      remaining(block(board, i), stats)
    )
  }

  //
  // Iterate over the board
  //
  let pass = 0
  let experiment = false

  while (stats.vals !== 0) {
    ++pass
if(DD) console.log("--- PASS", pass)
if(VV && !DD) printBoard(board)

    // Remember the remaining values counter value
    let valsCount = stats.vals

if(DD) console.log("stats (before):", stats.vals)

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== '.' && typeof board[r][c] === "string") {
if(DD) console.log("have: ", board[r][c])
          continue
        }

if(DD && pass !== 1) printBoard(board)

        // Calculate block number
        let b = Math.floor(r / 3) * 3 + Math.floor(c / 3)

        //
        // Values that are simultaneously required by the the row, column and block,
        // and which haven't already been used, are possible values for this cell
        //
        // The goal is to narrow it down to one possible value
        //
        let choices =
          (pass === 1) ?
            triplicates(
              blocks[b].concat(rows[r], cols[c])
            )
            // Use cached value after first pass
            : board[r][c]

if(DD) console.log("row:", r, "col:", c, "block:", b)
if(DD) console.log(choices)

        if (choices.length === 0) {
if(VV) console.info("ERROR: No choices (we made a bad guess / or the board is not solvable)")
          return false
        }

        // In experimental mode, take the first cell with multiple choices and try the values one by one
        if (choices.length > 1 && experiment) {
if(DD) console.log("launching speculative attempt")
          for (let i = 0; i < choices.length; i++ ) {
            let newBoard = copyBoard(board)

if(DD) console.log("trying experimental value:", choices[i])
            newBoard[r][c] = choices[i]

            if (solveSudoku(newBoard)) {
              // Copy the solved board to its parent copy
              copyBoard(newBoard, board)
if(DD) console.log("solved")

              // Solved!
              return true
            }
          }
        }

        let val

        if (choices.length === 1) {
          val = choices[0]
          board[r][c] = val
if(DD) console.log("found exact value:", val)
        } else {
          // Update the possiblities associated with this cell
          board[r][c] = choices

          // On the first pass we don't have the information for the whole board yet
          if (pass !== 1) {
            val = 
              checkRow(board[r], c, choices)
              || checkCol(board, c, r, choices)
              || checkBlock(board, b, r, c, choices)
          }
        }

        if (val) {
          board[r][c] = val

          // Update the remaining values indices
          stats.vals -= deleteValue(rows[r], val)
          stats.vals -= deleteValue(cols[c], val)
          stats.vals -= deleteValue(blocks[b], val)

          // Update the board to reflect that this cell now has a specific value
          if (!invalidatePossibility(board, r, c, b, val)) {
if(DD) console.log('board contradiction, this is a dead end')
            return false
          }
        }
      }
    }

if(DD) console.log("stats (after):", stats.vals, "(diff = " + (stats.vals - valsCount) + ")")

    // If board didn't change after this pass, it's time to try something new
    if (stats.vals === valsCount) {
if(DD) console.log("impasse detected, initiating experimental strategy")
      experiment = true
    }
  }

  // This signals a correct solution has been found
  return true
}

function copyBoard(board, secondBoard = []) {
  // Clear the second board
  secondBoard.length = 0

  for (let i = 0; i < 9; i++)
    secondBoard.push(board[i].concat())

  return secondBoard
}

function printBoard(board, colWidth = 9) {
  for (let r = 0; r < 9; r++) {
    let out = []

    for (let c = 0; c < 9; c++) {
      let cell = board[r][c]

      if (typeof cell === "string")
        out.push(cell + " ".repeat(colWidth - cell.length))
      else if (cell.length)
        out.push(cell.join("") + " ".repeat(colWidth - cell.length))
      else
        out.push('[]     ')
    }

    console.log(out.join(" "))
  }
}

// Remove value from array and return 1 if removed. otherwise 0
function deleteValue(arr, val) {
  if (Array.isArray(arr)) {
    let idx = arr.indexOf(val)

    if (idx !== -1)
      return arr.splice(idx, 1).length
  }
}

// Isolate the values which are triplicates in an array
function triplicates(arr) {
  let res = []

  while (arr.length) {
    let v = arr.pop()
    let i = arr.indexOf(v)

    if (i !== -1) {
      arr.splice(i, 1)
      i = arr.indexOf(v)

      if (i !== -1) {
        arr.splice(i, 1)
        res.push(v)
      }
    }
  }

  return res
}

// Execute a function for every cell in a block
function doBlock(board, blockIdx, func) {
  let rowOffset = 3 * Math.floor(blockIdx / 3)
  let colOffset = 3 * (blockIdx % 3)

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let cell = board[rowOffset + r][colOffset + c]
      func(cell, r, c)
    }
  }
}

// Look for a unique solution to a cell in the context of one of its sudoku-spans (row, column or block)
function checkSpan(collect, choices) {
  let nearby = []
  
  collect(nearby)

if(DD) console.log("nearby choices:", nearby)
if(DD) console.log("choices:", choices)

  // This error condition probably shouldn't happen unless there's a bug in the algorithm
  if (nearby.length === 0) {
if(DD) console.log("no nearby choices, this shouldn't happen")
    return
  }

  // Look for choice for this cell that is a unique possibility for this span
  for (let i = 0; i < choices.length; i++) {
    if (nearby.indexOf(choices[i]) === -1) {
VV && console.log("unique choice found:", choices[i])
      return choices[i]
    }
  }

if(DD) console.log("unique choice not found")
}

// Check row to see if one of the cell's choices is unique
function checkRow(row, omitColumn, choices) {
if(DD) console.log("checking row")
  return checkSpan(
    (acc) => {
      for (let i = 0; i < 9; i++)
        if (i !== omitColumn && typeof row[i] !== "string")
          acc.push.apply(acc, row[i])
    },
    choices
  )
}

// Check column to see if one of the cell's choices is unique
function checkCol(board, colIdx, omitRow, choices) {
if(DD) console.log("checking column", colIdx)
  return checkSpan(
    (acc) => {
      for (let i = 0; i < 9; i++)
        if (i !== omitRow && typeof board[i][colIdx] !== "string")
          acc.push.apply(acc, board[i][colIdx])
    },
    choices
  )
}

// Check block to see if one of the cell's choices is unique
function checkBlock(board, blockIdx, omitRow, omitCol, choices) {
if(DD) console.log("checking block", blockIdx)
  return checkSpan(
    (acc) => {
      doBlock(board, blockIdx, (cell, r, c) => {
        if (!(r === omitRow && c === omitCol) && typeof cell !== "string")
          acc.push.apply(acc, cell)
      })
    },
    choices
  )
}

//
// Invalidate a value that used to be considered a possiblity for all of a cell's relevant sudoku-spans
//
// This function also catches a board contradiction (broken solution attempt) and returns false
//
function invalidatePossibility(board, rowIdx, colIdx, blockIdx, val) {
  for (let i = 0; i < 9; i++)
    if (deleteValue(board[rowIdx][i], val))
      if (board[rowIdx][i].length === 0)
        return false

  for (let i = 0; i < 9; i++)
    if (deleteValue(board[i][colIdx], val))
      if (board[i][colIdx].length === 0)
        return false

  doBlock(board, blockIdx, (cell) => {
    if (deleteValue(cell, val))
      if (cell.length === 0)
        return false
  })

  return true
}

// Round up remaing values for a sudoku-span
function remaining(have, stats) {
  let res = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  have.forEach(
    x => {
      deleteValue(res, x)
    }
  )

  // Update the reference stats, since this count is used to determine when the board has been solved
  stats.vals += res.length

  return res
}

// Round up already determined values for a board column
function column(board, idx) {
  let inputs = []

  for (let i = 0; i < 9; i++) {
    let x = board[i][idx]
    x !== '.' && inputs.push(x)
  }

  return inputs
}

// Blocks are indexed as:
//
// 0 1 2
// 3 4 5
// 6 7 8
function block(board, idx) {
  let inputs = []

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let v =
        board
          [3 * Math.floor(idx / 3) + row]
          [3 * (idx % 3) + col]

      v !== '.' && inputs.push(v)
    }
  }
  return inputs
}
