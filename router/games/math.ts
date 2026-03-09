import { Request, Response } from "express"

const modes: { [key: string]: (string | number)[] } = {
  noob: [-3, 3, -3, 3, "+-", 15e3, 10],
  easy: [-10, 10, -10, 10, "*/+-", 2e4, 40],
  medium: [-40, 40, -20, 20, "*/+-", 4e4, 150],
  hard: [-100, 100, -70, 70, "*/+-", 6e4, 350],
  extreme: [-999999, 999999, -999999, 999999, "*/", 99999, 9999],
  impossible: [
    -99999999999,
    99999999999,
    -99999999999,
    999999999999,
    "*/",
    3e4,
    35e3,
  ],
  impossible2: [
    -999999999999999,
    999999999999999,
    -999,
    999,
    "/",
    3e4,
    5e4,
  ],
  impossible3: [
    -9007199254740991,
    9007199254740991,
    -9007199254740991,
    9007199254740991,
    "*/",
    1e5,
    1e5,
  ],
  impossible4: [
    -9007199254740991,
    9007199254740991,
    -9007199254740991,
    9007199254740991,
    "*/",
    5e5,
    5e5,
  ],
  impossible5: [
    -9007199254740991,
    9007199254740991,
    -9007199254740991,
    9007199254740991,
    "*/",
    1e6,
    1e6,
  ],
}

const operators: { [key: string]: string } = {
  "+": "+",
  "-": "-",
  "*": "×",
  "/": "÷",
}

function randomInt(from: number, to: number): number {
  if (from > to) [from, to] = [to, from]
  from = Math.floor(from)
  to = Math.floor(to)
  return Math.floor((to - from) * Math.random() + from)
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function generateQuestion(level: string) {
  const [a1, a2, b1, b2, ops, time, bonus] = modes[level] as [
    number,
    number,
    number,
    number,
    string,
    number,
    number,
  ]

  let a = randomInt(a1, a2)
  let b = randomInt(b1, b2)
  const op = pickRandom([...ops])
  let result: number

  if (op === "/") {
    while (b === 0) {
      b = randomInt(b1, b2)
    }
    result = a
    a = result * b
  } else {
    result = new Function(`return ${a} ${op} ${b < 0 ? `(${b})` : b}`)()
  }

  return {
    str: `${a} ${operators[op]} ${b}`,
    mode: level,
    time: time,
    bonus: bonus,
    result: result,
  }
}

export default async function familly100Handler(req: Request, res: Response) {
  const level = (req.query.level as string) || "easy"

  if (!modes[level]) {
    return res.status(400).json({
      status: false,
      message: `Invalid level. Available: ${Object.keys(modes).join(", ")}`,
    })
  }

  try {
    const result = await generateQuestion(level)
    res.json({ status: true, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
