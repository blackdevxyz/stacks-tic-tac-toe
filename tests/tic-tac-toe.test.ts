import { Cl } from "@stacks/transactions";

import { describe, expect, it } from "vitest";
import { TupleCV } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const player1 = accounts.get("wallet_1")!;
const player2 = accounts.get("wallet_2")!;

describe("Tic-Tac-Toe Contract with Leaderboard", () => {
  it("creates a game with a bet", () => {
    const { result } = simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)], // 1 STX bet, position 0, X
      player1
    );

    expect(result).toBeOk(Cl.uint(0)); // Game ID 0
  });

  it("rejects creating a game with zero bet", () => {
    const { result } = simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(0), Cl.uint(0), Cl.uint(1)],
      player1
    );

    expect(result).toBeErr(Cl.uint(100)); // ERR_MIN_BET_AMOUNT
  });

  it("allows player 2 to join game", () => {
    // Player 1 creates game
    simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)],
      player1
    );

    // Player 2 joins
    const { result } = simnet.callPublicFn(
      "tic-tac-toe",
      "join-game",
      [Cl.uint(0), Cl.uint(1), Cl.uint(2)], // Game 0, position 1, O
      player2
    );

    expect(result).toBeOk(Cl.uint(0));
  });

  it("rejects joining with wrong piece (X instead of O)", () => {
    simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)],
      player1
    );

    const { result } = simnet.callPublicFn(
      "tic-tac-toe",
      "join-game",
      [Cl.uint(0), Cl.uint(1), Cl.uint(1)], // Trying to play X
      player2
    );

    expect(result).toBeErr(Cl.uint(101)); // ERR_INVALID_MOVE
  });

  it("allows alternating turns during gameplay", () => {
    // Create game
    simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)],
      player1
    );

    // Player 2 joins
    simnet.callPublicFn(
      "tic-tac-toe",
      "join-game",
      [Cl.uint(0), Cl.uint(1), Cl.uint(2)],
      player2
    );

    // Player 1's turn
    const move1 = simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(3), Cl.uint(1)],
      player1
    );
    expect(move1.result).toBeOk(Cl.uint(0));

    // Player 2's turn
    const move2 = simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(4), Cl.uint(2)],
      player2
    );
    expect(move2.result).toBeOk(Cl.uint(0));
  });

  it("rejects move when not player's turn", () => {
    simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)],
      player1
    );

    simnet.callPublicFn(
      "tic-tac-toe",
      "join-game",
      [Cl.uint(0), Cl.uint(1), Cl.uint(2)],
      player2
    );

    // Player 2 tries to play when it's Player 1's turn
    const { result } = simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(3), Cl.uint(2)],
      player2
    );

    expect(result).toBeErr(Cl.uint(104)); // ERR_NOT_YOUR_TURN
  });

  it("rejects move on occupied position", () => {
    simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)],
      player1
    );

    simnet.callPublicFn(
      "tic-tac-toe",
      "join-game",
      [Cl.uint(0), Cl.uint(1), Cl.uint(2)],
      player2
    );

    // Player 1 tries to play on position 0 (already taken during create)
    const { result } = simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(0), Cl.uint(1)],
      player1
    );

    expect(result).toBeErr(Cl.uint(101)); // ERR_INVALID_MOVE
  });

  it("detects horizontal win and updates leaderboard", () => {
    // Create game - Player 1 plays position 0
    simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)],
      player1
    );

    // Player 2 joins - plays position 3
    simnet.callPublicFn(
      "tic-tac-toe",
      "join-game",
      [Cl.uint(0), Cl.uint(3), Cl.uint(2)],
      player2
    );

    // Player 1 plays position 1
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(1), Cl.uint(1)],
      player1
    );

    // Player 2 plays position 4
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(4), Cl.uint(2)],
      player2
    );

    // Player 1 plays position 2 and wins (top row: 0, 1, 2)
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(2), Cl.uint(1)],
      player1
    );

    // Check leaderboard - player 1 should have 1 win
    const wins = simnet.callReadOnlyFn(
      "tic-tac-toe",
      "get-player-wins",
      [Cl.principal(player1)],
      player1
    );

    const winsData = wins.result as TupleCV;
    expect(winsData.data["wins"]).toStrictEqual(Cl.uint(1));
  });

  it("detects diagonal win and updates leaderboard", () => {
    // Create game - Player 1 plays position 0
    simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)],
      player1
    );

    // Player 2 joins - plays position 1
    simnet.callPublicFn(
      "tic-tac-toe",
      "join-game",
      [Cl.uint(0), Cl.uint(1), Cl.uint(2)],
      player2
    );

    // Player 1 plays position 4 (center)
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(4), Cl.uint(1)],
      player1
    );

    // Player 2 plays position 2
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(2), Cl.uint(2)],
      player2
    );

    // Player 1 plays position 8 and wins (diagonal: 0, 4, 8)
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(8), Cl.uint(1)],
      player1
    );

    // Check leaderboard - player 1 should have 1 win
    const wins = simnet.callReadOnlyFn(
      "tic-tac-toe",
      "get-player-wins",
      [Cl.principal(player1)],
      player1
    );

    const winsData = wins.result as TupleCV;
    expect(winsData.data["wins"]).toStrictEqual(Cl.uint(1));
  });

  it("tracks multiple wins correctly", () => {
    // Game 1 - Player 1 wins
    simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)],
      player1
    );
    simnet.callPublicFn(
      "tic-tac-toe",
      "join-game",
      [Cl.uint(0), Cl.uint(3), Cl.uint(2)],
      player2
    );
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(1), Cl.uint(1)],
      player1
    );
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(4), Cl.uint(2)],
      player2
    );
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(0), Cl.uint(2), Cl.uint(1)],
      player1
    );

    // Game 2 - Player 2 wins
    simnet.callPublicFn(
      "tic-tac-toe",
      "create-game",
      [Cl.uint(1000000), Cl.uint(0), Cl.uint(1)],
      player1
    );
    simnet.callPublicFn(
      "tic-tac-toe",
      "join-game",
      [Cl.uint(1), Cl.uint(3), Cl.uint(2)],
      player2
    );
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(1), Cl.uint(1), Cl.uint(1)],
      player1
    );
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(1), Cl.uint(4), Cl.uint(2)],
      player2
    );
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(1), Cl.uint(6), Cl.uint(1)],
      player1
    );
    simnet.callPublicFn(
      "tic-tac-toe",
      "play",
      [Cl.uint(1), Cl.uint(5), Cl.uint(2)],
      player2
    );

    // Check both players' wins
    const p1Wins = simnet.callReadOnlyFn(
      "tic-tac-toe",
      "get-player-wins",
      [Cl.principal(player1)],
      player1
    );
    const p1Data = p1Wins.result as TupleCV;
    expect(p1Data.data["wins"]).toStrictEqual(Cl.uint(1));

    const p2Wins = simnet.callReadOnlyFn(
      "tic-tac-toe",
      "get-player-wins",
      [Cl.principal(player2)],
      player2
    );
    const p2Data = p2Wins.result as TupleCV;
    expect(p2Data.data["wins"]).toStrictEqual(Cl.uint(1));
  });

  it("returns zero wins for player with no wins", () => {
    const wins = simnet.callReadOnlyFn(
      "tic-tac-toe",
      "get-player-wins",
      [Cl.principal(deployer)],
      deployer
    );
    expect(Cl.prettyPrint(wins.result)).toContain("wins: u0");
  });
});
