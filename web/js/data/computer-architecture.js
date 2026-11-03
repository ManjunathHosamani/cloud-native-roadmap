// Computer Architecture & Operating Systems roadmap.
// Schema: see CONTRIBUTING.md. Validate with: node scripts/validate-content.js web/js/data/computer-architecture.js
registerRoadmap({
  id: 'computer-architecture',
  order: 70,
  title: 'Computer Architecture & Operating Systems',
  short: 'Comp. Arch & OS',
  icon: '🖥️',
  color: '#F59E0B',
  desc: 'CPUs, caches, memory, virtual memory, processes, threads, concurrency and I/O — the hardware and OS beneath your services.',
  unit: 'Module',
  modules: [
    // ───────────────────────────── Module 1 ─────────────────────────────
    {
      n: 1,
      title: 'Computer Fundamentals',
      summary: 'How a CPU, memory and I/O fit together, how instructions execute, and how integers, floats and bytes are really represented — the root cause of overflow, precision and byte-order bugs in backend code.',
      topics: [
        {
          title: 'Von Neumann Architecture & the Fetch-Decode-Execute Cycle',
          def: `<p>Almost every machine you deploy to follows the <strong>von Neumann architecture</strong>: a <strong>CPU</strong>, a single <strong>main memory</strong> that stores <em>both</em> instructions and data, and <strong>I/O devices</strong>, all connected by <strong>buses</strong> (address, data and control lines; today: an on-die memory controller, PCIe and a chip interconnect).</p>
<table><thead><tr><th>Component</th><th>Role</th><th>Modern example</th></tr></thead><tbody>
<tr><td>Control unit</td><td>Fetches/decodes instructions, drives the datapath</td><td>Front-end + decoders + micro-op cache</td></tr>
<tr><td>ALU / FPU</td><td>Integer and floating-point arithmetic, logic</td><td>Several execution ports per core</td></tr>
<tr><td>Registers</td><td>Tiny, fastest storage (~0 cycle access)</td><td>16 GPRs on x86-64, 31 on ARM64</td></tr>
<tr><td>Memory</td><td>Holds code + data, addressed by byte</td><td>DDR5 DRAM behind L1/L2/L3 caches</td></tr>
<tr><td>I/O</td><td>Disks, NICs, GPUs</td><td>NVMe, 100 GbE NIC over PCIe, DMA</td></tr>
</tbody></table>
<p>The CPU endlessly runs the <strong>instruction cycle</strong>:</p>
<ol><li><strong>Fetch</strong> the instruction at the program counter (PC, <code>RIP</code> on x86-64) and advance the PC.</li>
<li><strong>Decode</strong> the opcode and operands (registers, immediates, memory addresses).</li>
<li><strong>Execute</strong> in the ALU, or perform a load/store, or update the PC for a branch.</li>
<li><strong>Write back</strong> the result to a register or memory.</li></ol>
<p>Because code and data share one path to memory, the processor can execute far faster than memory can feed it — the <strong>von Neumann bottleneck</strong>. That gap is why caches, prefetchers and out-of-order execution exist (Modules 2–3). Modern CPUs actually split L1 into instruction and data caches (a <em>modified Harvard</em> design), but software still sees one flat address space, which is also why the OS marks data pages non-executable (NX bit) to stop injected code.</p>
<p><strong>Go connection:</strong> every Go statement compiles to these machine instructions. A goroutine is just a saved PC, stack pointer and a few registers that the Go scheduler loads onto an OS thread — which is why switching goroutines is so cheap.</p>`,
          interview: 'Be ready to trace one instruction (e.g. ADD) through fetch, decode, execute and write-back, name what lives in registers versus memory, and explain the von Neumann bottleneck as the reason caches exist. Mentioning that a goroutine/thread context is "just PC + SP + registers" connects the hardware to scheduling questions.',
          examples: [
            {
              label: 'See the machine code Go generates (amd64, register ABI)',
              lang: 'go',
              code: `// add.go
package main

//go:noinline
func add(a, b int) int { return a + b }

func main() { println(add(2, 3)) }

// $ go build -gcflags=-S add.go 2>&1 | grep -A3 'main.add STEXT'
// main.add STEXT nosplit size=4 args=0x10 locals=0x0 funcid=0x0 align=0x0
//     0x0000 00000 (add.go:5)  ADDQ BX, AX   // a arrives in AX, b in BX
//     0x0003 00003 (add.go:5)  RET           // result returned in AX
//
// Since Go 1.17 (amd64) arguments are passed in registers, not on the stack:
// one fetch-decode-execute of ADDQ does the whole function body.`
            }
          ]
        },
        {
          title: 'Instruction Set Architectures: CISC vs RISC, x86-64 vs ARM64',
          def: `<p>The <strong>ISA</strong> is the contract between software and hardware: the instructions, registers, addressing modes and memory-ordering rules a compiler may rely on. The same ISA can be implemented by very different microarchitectures (Intel vs AMD x86-64 cores).</p>
<ul><li><strong>CISC</strong> (Complex Instruction Set): many instructions, variable length, arithmetic may operate directly on memory. Example: x86-64.</li>
<li><strong>RISC</strong> (Reduced Instruction Set): fewer, simpler, fixed-length instructions; a <em>load/store</em> architecture where only loads and stores touch memory. Examples: ARM64 (AArch64), RISC-V.</li></ul>
<table><thead><tr><th>Aspect</th><th>x86-64</th><th>ARM64</th></tr></thead><tbody>
<tr><td>Instruction length</td><td>1–15 bytes (variable)</td><td>4 bytes (fixed)</td></tr>
<tr><td>General-purpose registers</td><td>16 (RAX…R15)</td><td>31 (X0…X30) + zero reg/SP</td></tr>
<tr><td>Memory operands in ALU ops</td><td>Yes</td><td>No (load/store only)</td></tr>
<tr><td>Memory model</td><td>Strong (TSO)</td><td>Weakly ordered</td></tr>
<tr><td>SIMD</td><td>SSE/AVX2/AVX-512</td><td>NEON, SVE/SVE2</td></tr>
<tr><td>Cloud examples</td><td>Intel Xeon, AMD EPYC</td><td>AWS Graviton, Ampere, Google Axion, Azure Cobalt</td></tr>
</tbody></table>
<p>The debate is mostly historical: modern x86 cores decode CISC instructions into RISC-like <strong>micro-ops</strong> internally, and modern ARM cores are just as deeply out-of-order. What still matters in practice:</p>
<ul><li><strong>Memory model</strong>: code with a data race may appear to "work" on x86 (strong ordering) and break on ARM. Go's memory model and the race detector protect you only if you use proper synchronization.</li>
<li><strong>Price/performance</strong>: ARM instances are often 20–40% cheaper per unit of work, so teams ship multi-arch images.</li>
<li><strong>Registers</strong>: PC, stack pointer, general-purpose, flags (zero, carry, overflow, sign) and vector registers. The OS saves all of them on every context switch.</li></ul>`,
          interview: 'Interviewers rarely want an ISA history lesson; they probe whether you know that x86 is strongly ordered while ARM is weakly ordered (so racy code can fail only on Graviton), that x86 decodes to micro-ops, and how you build and ship multi-arch Go binaries/images.',
          examples: [
            {
              label: 'Cross-compile Go for ARM64 and build a multi-arch image',
              lang: 'bash',
              code: `$ GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o app-arm64 .
$ file app-arm64
app-arm64: ELF 64-bit LSB executable, ARM aarch64, version 1 (SYSV), statically linked, Go BuildID=..., not stripped
#           ^^^ LSB = little-endian

$ uname -m          # on the server
aarch64

$ docker buildx build --platform linux/amd64,linux/arm64 -t registry.example.com/app:1.4.0 --push .`
            }
          ]
        },
        {
          title: 'Binary, Hex, Two\'s Complement & Integer Overflow',
          def: `<p>Computers store everything as bits. <strong>Hex</strong> is shorthand: each hex digit is exactly 4 bits, so a byte is two hex digits (<code>0xFF</code> = 255 = <code>1111 1111</code>).</p>
<p>Signed integers use <strong>two's complement</strong>: to negate <code>x</code>, invert all bits and add 1 (<code>-x == ^x + 1</code>). The top bit has weight <code>-2<sup>n-1</sup></code>, so an n-bit integer ranges from <code>-2<sup>n-1</sup></code> to <code>2<sup>n-1</sup>-1</code>.</p>
<table><thead><tr><th>int8 bits</th><th>Unsigned</th><th>Signed</th></tr></thead><tbody>
<tr><td>0111 1111</td><td>127</td><td>127 (MaxInt8)</td></tr>
<tr><td>1000 0000</td><td>128</td><td>-128 (MinInt8)</td></tr>
<tr><td>1111 1111</td><td>255</td><td>-1</td></tr>
<tr><td>1111 1011</td><td>251</td><td>-5</td></tr>
</tbody></table>
<p>Why hardware loves it: there is only one zero, and the <em>same adder circuit</em> handles signed and unsigned addition; only the interpretation of the flags differs (carry flag = unsigned overflow, overflow flag = signed overflow).</p>
<p><strong>Overflow in Go</strong>:</p>
<ul><li>Run-time integer overflow <strong>wraps silently</strong> for both signed and unsigned types — it is defined behaviour (unlike C, where signed overflow is undefined). No panic, no error.</li>
<li>Constant overflow (<code>var x int8 = 200</code>) is a <strong>compile-time error</strong>.</li>
<li>Integer division by zero <strong>panics</strong>; <code>math.MinInt64 / -1</code> wraps back to <code>MinInt64</code>.</li>
<li>Narrowing conversions truncate (<code>int32(int64(1&lt;&lt;32 + 5)) == 5</code>), and <code>uint(-1)</code> on a variable becomes 18446744073709551615.</li>
<li><code>int</code> is 64 bits on 64-bit platforms; <code>len()</code> returns <code>int</code>.</li></ul>
<p>Famous bugs: the binary-search midpoint <code>(lo+hi)/2</code> overflow (in the JDK for ~9 years), Ariane 5 (64-bit float to 16-bit int), counters and sequence numbers wrapping, and <code>uint</code> subtraction producing huge values (<code>len(a)-len(b)</code> with unsigned types).</p>`,
          interview: 'Expect "what does int8(127)+1 give in Go and why", "how do you detect overflow", and the binary-search midpoint bug. Know that Go wraps silently (defined behaviour), constants overflow at compile time, math/bits.Add64/Mul64 expose carries, and two\'s complement lets one adder serve signed and unsigned math.',
          examples: [
            {
              label: 'Two\'s complement and wrap-around in Go',
              lang: 'go',
              code: `package main

import (
    "fmt"
    "math"
    "math/bits"
)

func main() {
    var a int8 = 127
    a++
    fmt.Println(a) // -128: silent wrap-around, no panic

    var u uint32 = 0
    u--
    fmt.Println(u) // 4294967295

    n := int8(-5)
    fmt.Printf("%08b\\n", uint8(n)) // 11111011 == ^00000101 + 1

    x := math.MinInt64
    fmt.Println(x / -1) // -9223372036854775808 (wraps, per the Go spec)

    sum, carry := bits.Add64(math.MaxUint64, 1, 0)
    fmt.Println(sum, carry) // 0 1  -> carry-out signals unsigned overflow
}`
            }
          ]
        },
        {
          title: 'Floating Point: IEEE 754 and Its Pitfalls',
          def: `<p>A <code>float64</code> (IEEE 754 double) stores <strong>1 sign bit, 11 exponent bits (bias 1023) and 52 fraction bits</strong> (53 bits of precision with the implicit leading 1): value = (-1)<sup>s</sup> × 1.fraction × 2<sup>exp-1023</sup>. That gives ~15–17 significant decimal digits. <code>float32</code> uses 1/8/23 bits, ~7 digits.</p>
<table><thead><tr><th>Pitfall</th><th>Example</th><th>Consequence</th></tr></thead><tbody>
<tr><td>Decimal fractions are not exact</td><td><code>0.1 + 0.2 = 0.30000000000000004</code></td><td>Never use <code>==</code> on computed floats</td></tr>
<tr><td>Integers exact only to 2<sup>53</sup></td><td><code>2^53 + 1 == 2^53</code></td><td>int64 IDs corrupted in JSON/JavaScript</td></tr>
<tr><td>Not associative</td><td><code>(a+b)+c != a+(b+c)</code></td><td>Parallel sums differ run-to-run</td></tr>
<tr><td>NaN</td><td><code>NaN != NaN</code></td><td>NaN map keys can never be found</td></tr>
<tr><td>Signed zero, infinities</td><td><code>1.0/0.0 = +Inf</code> (no panic)</td><td>Silent garbage propagates</td></tr>
<tr><td>Catastrophic cancellation</td><td>subtracting nearly equal values</td><td>Most significant digits lost</td></tr>
</tbody></table>
<p><strong>Rules for backend code:</strong></p>
<ul><li><strong>Money</strong>: store integer minor units (<code>int64</code> cents) or use a decimal type; never <code>float64</code>.</li>
<li><strong>Comparisons</strong>: use a relative tolerance (<code>|a-b| &lt;= eps·max(|a|,|b|)</code>), not <code>==</code>.</li>
<li><strong>IDs</strong>: send int64 IDs as JSON strings; JavaScript numbers are float64.</li>
<li><strong>Summation</strong>: sum many values with Kahan/pairwise summation or in a fixed order if reproducibility matters.</li>
<li><strong>Conversions</strong>: in Go, converting an out-of-range float (or NaN) to an int gives an implementation-dependent value — validate first.</li></ul>
<p>Go gotcha: untyped <em>constant</em> arithmetic is exact, so <code>0.1+0.2 == 0.3</code> is <code>true</code> as constants but <code>false</code> with variables.</p>`,
          interview: 'Classic probes: why 0.1+0.2 != 0.3, why money must not be float64, how to compare floats, and why a 64-bit ID breaks in a browser (2^53). Strong candidates also mention non-associativity making parallel aggregations non-deterministic and NaN behaviour in maps and sorting.',
          examples: [
            {
              label: 'Floating-point surprises in Go',
              lang: 'go',
              code: `package main

import (
    "fmt"
    "math"
)

func almostEqual(a, b, relTol float64) bool {
    if a == b {
        return true
    }
    return math.Abs(a-b) <= relTol*math.Max(math.Abs(a), math.Abs(b))
}

func main() {
    fmt.Println(0.1+0.2 == 0.3) // true: untyped constants are exact
    a, b := 0.1, 0.2
    fmt.Println(a+b == 0.3)                  // false
    fmt.Println(a + b)                       // 0.30000000000000004
    fmt.Println(almostEqual(a+b, 0.3, 1e-9)) // true

    big := float64(1 << 53)
    fmt.Println(big+1 == big) // true: 2^53+1 is not representable

    nan := math.NaN()
    fmt.Println(nan == nan) // false
    m := map[float64]int{}
    m[nan] = 1
    m[nan] = 2
    fmt.Println(len(m)) // 2: NaN keys never match each other
}`
            }
          ]
        },
        {
          title: 'Endianness, Alignment & Data Layout',
          def: `<p><strong>Endianness</strong> is the order in which the bytes of a multi-byte value are stored. For <code>0x0A0B0C0D</code> at address 100:</p>
<table><thead><tr><th>Address</th><th>100</th><th>101</th><th>102</th><th>103</th></tr></thead><tbody>
<tr><td>Big-endian</td><td>0A</td><td>0B</td><td>0C</td><td>0D</td></tr>
<tr><td>Little-endian</td><td>0D</td><td>0C</td><td>0B</td><td>0A</td></tr>
</tbody></table>
<ul><li><strong>x86-64</strong> is little-endian; <strong>ARM64</strong> is bi-endian but Linux, macOS and Windows run it little-endian.</li>
<li><strong>Network byte order</strong> (IP/TCP/UDP headers) is big-endian, as are many wire protocols (Kafka, DNS). Protobuf varints and many file formats are little-endian.</li>
<li>In Go, never reinterpret memory with <code>unsafe</code> to serialise; use <code>encoding/binary</code> (<code>BigEndian</code>, <code>LittleEndian</code>, and <code>NativeEndian</code> since Go 1.21). The compiler turns <code>binary.BigEndian.Uint32(b)</code> into a single load + byte-swap instruction.</li></ul>
<p><strong>Alignment</strong>: CPUs load data most efficiently when a value of size N sits at an address divisible by N. Compilers insert <strong>padding</strong> to achieve this, so field order changes struct size:</p>
<ul><li><code>struct{ a bool; b int64; c bool }</code> = 24 bytes (7 + 7 bytes of padding).</li>
<li><code>struct{ b int64; a bool; c bool }</code> = 16 bytes.</li></ul>
<p>With millions of structs in a cache or slice, ordering fields largest-first saves memory and cache lines. 64-bit atomics on 32-bit platforms require 8-byte alignment — use <code>atomic.Int64</code>, which guarantees it. A value that straddles two cache lines (a <em>split load</em>) is slower and, for atomics, can be dramatically slower.</p>`,
          interview: 'Know which byte order x86/ARM and the network use, how to serialise integers portably in Go (encoding/binary, never unsafe casts), and how struct padding changes memory footprint. Interviewers like the follow-up "how would you shrink this struct" or "why is this binary protocol broken on another machine".',
          examples: [
            {
              label: 'Byte order and struct padding in Go',
              lang: 'go',
              code: `package main

import (
    "encoding/binary"
    "fmt"
    "unsafe"
)

type Bad struct { // 24 bytes: a(1)+pad(7) b(8) c(1)+pad(7)
    a bool
    b int64
    c bool
}

type Good struct { // 16 bytes: b(8) a(1) c(1) pad(6)
    b int64
    a bool
    c bool
}

func main() {
    buf := make([]byte, 4)
    binary.BigEndian.PutUint32(buf, 0x0A0B0C0D)
    fmt.Printf("% x\\n", buf) // 0a 0b 0c 0d  (network order)
    binary.LittleEndian.PutUint32(buf, 0x0A0B0C0D)
    fmt.Printf("% x\\n", buf) // 0d 0c 0b 0a  (x86-64 / arm64 memory order)

    fmt.Println(unsafe.Sizeof(Bad{}), unsafe.Sizeof(Good{})) // 24 16
}`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Convert 0xDEADBEEF to binary, unsigned and signed int32 decimal',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Each hex digit maps to exactly 4 bits: D=1101, E=1110, A=1010, B=1011, F=1111.</li><li>Unsigned value: sum of digit × 16<sup>position</sup>.</li><li>Signed int32: if the top bit is 1, subtract 2<sup>32</sup>.</li></ul>`,
          solution: `0xDEADBEEF
binary : 1101 1110 1010 1101 1011 1110 1110 1111
uint32 : 3735928559
int32  : 3735928559 - 4294967296 = -559038737   (top bit is 1 -> negative)

Check in Go:
    v := uint32(0xDEADBEEF)
    fmt.Println(v, int32(v))          // 3735928559 -559038737
    fmt.Printf("%032b\\n", v)

Also: int32(-1) is 0xFFFFFFFF (all ones), MinInt32 is 0x80000000.`,
          lang: 'text'
        },
        {
          t: 'Explain why int8(127)+1 == -128 in Go',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Write 127 in 8-bit two's complement and add 1.</li><li>What is the weight of the top bit in two's complement?</li><li>Does Go panic on run-time integer overflow?</li></ul>`,
          solution: `127 = 0111 1111
 +1 = 1000 0000
In two's complement the top bit weighs -128, so 1000 0000 = -128.

The adder simply produced the next bit pattern; the hardware sets the
overflow flag, but Go ignores it: run-time integer overflow wraps
silently (well-defined in Go, undefined behaviour for signed ints in C).
A *constant* expression like int8(128) is rejected at compile time.

To catch it: check before adding (a > MaxInt8-b), use math/bits for
unsigned carries, or use a wider type.`,
          lang: 'text'
        },
        {
          t: 'Compare floating-point results correctly',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li>Why is <code>0.1+0.2 == 0.3</code> false for variables?</li><li>Absolute epsilon breaks for very large or very small values — use a relative tolerance.</li><li>Handle exact equality (including infinities) first.</li></ul>`,
          solution: `package floats

import "math"

// AlmostEqual reports whether a and b are within a relative tolerance,
// with an absolute floor for values near zero.
func AlmostEqual(a, b, relTol, absTol float64) bool {
    if a == b { // also handles +Inf == +Inf
        return true
    }
    if math.IsNaN(a) || math.IsNaN(b) || math.IsInf(a, 0) || math.IsInf(b, 0) {
        return false
    }
    diff := math.Abs(a - b)
    return diff <= absTol || diff <= relTol*math.Max(math.Abs(a), math.Abs(b))
}

// AlmostEqual(0.1+0.2, 0.3, 1e-9, 1e-12) == true
// 0.1 and 0.2 have no exact binary representation, so their sum rounds
// to 0.30000000000000004 while the literal 0.3 rounds to 0.29999999999999998.`,
          lang: 'go'
        },
        {
          t: 'Fix the binary-search midpoint overflow bug',
          d: 'easy',
          type: 'debug',
          hint: `<ul><li>What happens to <code>lo + hi</code> when both are close to the maximum int?</li><li>Rewrite so the intermediate value never exceeds <code>hi</code>.</li><li>Go's <code>sort.Search</code> uses an unsigned shift trick.</li></ul>`,
          solution: `// Buggy: lo+hi can exceed MaxInt (or MaxInt32 for int32 indexes) and wrap negative.
mid := (lo + hi) / 2

// Fix 1: never exceeds hi
mid := lo + (hi-lo)/2

// Fix 2 (what sort.Search does): treat the sum as unsigned and shift
mid := int(uint(lo+hi) >> 1)

func binarySearch(a []int, target int) int {
    lo, hi := 0, len(a)-1
    for lo <= hi {
        mid := lo + (hi-lo)/2
        switch {
        case a[mid] == target:
            return mid
        case a[mid] < target:
            lo = mid + 1
        default:
            hi = mid - 1
        }
    }
    return -1
}

This bug sat in java.util.Arrays.binarySearch for about nine years; it only
fires with arrays larger than 2^30 elements, which is why tests missed it.`,
          lang: 'go'
        },
        {
          t: 'Power of two, set bits and lowest set bit with bit tricks',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li><code>x &amp; (x-1)</code> clears the lowest set bit.</li><li><code>x &amp; -x</code> isolates the lowest set bit (two's complement!).</li><li>Go's <code>math/bits</code> maps to single CPU instructions (POPCNT, TZCNT, LZCNT).</li></ul>`,
          solution: `package bitsx

import "math/bits"

func IsPowerOfTwo(x uint64) bool { return x != 0 && x&(x-1) == 0 }

// Kernighan: loop runs once per set bit.
func PopCount(x uint64) int {
    n := 0
    for x != 0 {
        x &= x - 1
        n++
    }
    return n
}

func LowestSetBit(x int64) int64 { return x & -x } // 12 (1100) -> 4 (0100)

// Round up to the next power of two (e.g. for ring-buffer sizes).
func NextPow2(x uint64) uint64 {
    if x <= 1 {
        return 1
    }
    return 1 << (64 - bits.LeadingZeros64(x-1))
}

// Production code: bits.OnesCount64(x), bits.TrailingZeros64(x) compile to
// POPCNT / TZCNT on amd64. Ring buffers use size = 2^k so that
// idx % size becomes idx & (size-1): a single AND instead of a division.`,
          lang: 'go'
        },
        {
          t: 'Detect signed integer overflow before it happens',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Addition overflows only when both operands have the same sign and the result's sign differs.</li><li>For multiplication, check <code>c/b == a</code>, plus the special case <code>MinInt64 * -1</code>.</li><li>For unsigned values, <code>bits.Add64</code> and <code>bits.Mul64</code> return the carry / high word.</li></ul>`,
          solution: `package checked

import (
    "errors"
    "math"
)

var ErrOverflow = errors.New("integer overflow") // checked-arithmetic sentinel

func Add(a, b int64) (int64, error) {
    c := a + b // wraps on overflow (defined in Go)
    if (a > 0 && b > 0 && c < 0) || (a < 0 && b < 0 && c >= 0) {
        return 0, ErrOverflow
    }
    return c, nil
}

func Mul(a, b int64) (int64, error) {
    if a == 0 || b == 0 {
        return 0, nil
    }
    if (a == -1 && b == math.MinInt64) || (b == -1 && a == math.MinInt64) {
        return 0, ErrOverflow
    }
    c := a * b
    if c/b != a {
        return 0, ErrOverflow
    }
    return c, nil
}

// Use for quotas, balances, byte counters, pagination offsets (offset+limit)
// and anything computed from user input.`,
          lang: 'go'
        },
        {
          t: 'Write a length-prefixed framing protocol in network byte order',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>TCP is a byte stream: you need framing to know where a message ends.</li><li>Use a 4-byte big-endian length header via <code>encoding/binary</code>.</li><li>Read with <code>io.ReadFull</code> and cap the maximum frame size to prevent memory-exhaustion attacks.</li></ul>`,
          solution: `package frame

import (
    "encoding/binary"
    "errors"
    "io"
)

const MaxFrame = 16 << 20 // 16 MiB

var ErrTooLarge = errors.New("frame too large")

func Write(w io.Writer, payload []byte) error {
    if len(payload) > MaxFrame {
        return ErrTooLarge
    }
    var hdr [4]byte
    binary.BigEndian.PutUint32(hdr[:], uint32(len(payload)))
    if _, err := w.Write(hdr[:]); err != nil {
        return err
    }
    _, err := w.Write(payload)
    return err
}

func Read(r io.Reader) ([]byte, error) {
    var hdr [4]byte
    if _, err := io.ReadFull(r, hdr[:]); err != nil {
        return nil, err
    }
    n := binary.BigEndian.Uint32(hdr[:])
    if n > MaxFrame {
        return nil, ErrTooLarge
    }
    buf := make([]byte, n)
    _, err := io.ReadFull(r, buf)
    return buf, err
}

// Writing a struct with unsafe.Pointer instead would bake in the sender's
// endianness and padding, breaking x86 <-> big-endian peers and other languages.`,
          lang: 'go'
        },
        {
          t: 'Design a money representation for a payments service',
          d: 'medium',
          type: 'design',
          hint: `<ul><li>Why is <code>float64</code> unacceptable (0.1 is not exact, errors accumulate)?</li><li>Integer minor units vs arbitrary-precision decimal.</li><li>Currencies have different exponents (JPY 0, USD 2, BHD 3); rounding mode must be explicit.</li><li>How is it stored in the DB and sent over JSON?</li></ul>`,
          solution: `type Money struct {
    Amount   int64  // minor units: cents for USD, yen for JPY
    Currency string // ISO 4217 code, e.g. "USD"
}

Rules:
- Arithmetic only between equal currencies; addition uses checked int64 math.
- Division/percentages (tax, FX, splitting a bill) use an explicit rounding
  mode (banker's rounding or half-up) and distribute remainders
  (e.g. 100 cents / 3 = 34 + 33 + 33).
- When sub-cent precision is needed (FX rates, unit prices) use a decimal
  type (shopspring/decimal, math/big.Rat) and round once at the boundary.
- DB: BIGINT minor units or NUMERIC(19,4) -- never FLOAT/DOUBLE.
- JSON: send amounts as strings ("12.34") or integer minor units with the
  currency, because JavaScript numbers are float64.

Why not float64: 0.1 has no finite binary representation, so summing
0.10 ten times gives 0.9999999999999999; across millions of ledger
entries the books stop balancing.`,
          lang: 'go'
        },
        {
          t: 'Debug: 64-bit order IDs change in the browser',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>What numeric type does JavaScript (and many JSON parsers) use?</li><li>How many integer bits can a float64 represent exactly?</li><li>Snowflake-style IDs are usually larger than 2<sup>53</sup>.</li></ul>`,
          solution: `Symptom: API returns {"id": 1789012345678901249}; the browser shows
1789012345678901200 and follow-up requests 404.

Root cause: JSON numbers are parsed into IEEE 754 doubles in JavaScript
(and by Go's encoding/json when decoding into interface{} / any).
A double has a 53-bit significand, so integers above 2^53
(9,007,199,254,740,992) are rounded to the nearest representable value.

Fix: encode IDs as strings.
    type Order struct {
        ID int64 \`json:"id,string"\`   // emits "id":"1789012345678901249"
    }
In Go consumers, decode with json.Decoder.UseNumber() or into int64 fields,
never into map[string]any. gRPC/protobuf's JSON mapping already encodes
int64 as strings for exactly this reason.`,
          lang: 'text'
        },
        {
          t: 'Sum a million float64 values accurately (Kahan summation)',
          d: 'hard',
          type: 'coding',
          hint: `<ul><li>Adding a tiny number to a huge running sum discards the tiny number's low bits.</li><li>Kahan keeps a running <em>compensation</em> term holding the lost low-order bits.</li><li>Why do parallel reductions (or SQL SUM over shards) give slightly different answers each run?</li></ul>`,
          solution: `package sum

// Naive summation error grows O(n * eps); Kahan's is O(eps), independent of n.
func Kahan(xs []float64) float64 {
    var sum, c float64 // c accumulates the lost low-order bits
    for _, x := range xs {
        y := x - c
        t := sum + y     // low bits of y are lost here...
        c = (t - sum) - y // ...and recovered here (algebraically 0)
        sum = t
    }
    return sum
}

// Demo:
//   xs := make([]float64, 1_000_000)
//   for i := range xs { xs[i] = 0.1 }
//   naive: 100000.00000133288
//   Kahan: 100000
//
// Why it matters: floating-point addition is not associative, so summing
// shards in a different order (goroutines finishing in different orders,
// map iteration order, distributed aggregation) yields different results.
// For reproducible reports, sum in a fixed order or use integers/decimals.
// Note: compile without -ffast-math style reassociation (Go never reorders
// float ops, so this is safe in Go).`,
          lang: 'go'
        }
      ],
      interviewFocus: [
        {
          q: 'Walk through what the CPU does to execute a Go statement like x = a + b.',
          a: `<p>The compiler turns the statement into a few instructions, e.g. on amd64: load <code>a</code> and <code>b</code> into registers (or they already are, thanks to Go's register ABI), <code>ADDQ BX, AX</code>, then store <code>AX</code> to <code>x</code>'s stack slot or keep it in a register.</p>
<ol><li><strong>Fetch</strong>: the front-end reads instruction bytes at <code>RIP</code> from the L1 instruction cache (miss → L2/L3/DRAM), guided by the branch predictor.</li>
<li><strong>Decode</strong>: x86 instructions are decoded into micro-ops (or taken from the micro-op cache).</li>
<li><strong>Rename/dispatch</strong>: architectural registers are mapped to physical registers; micro-ops wait in the scheduler until operands are ready.</li>
<li><strong>Execute</strong>: an integer ALU adds in ~1 cycle. A load of <code>a</code> from memory costs ~4–5 cycles if in L1, ~100 ns if it misses to DRAM.</li>
<li><strong>Retire/write-back</strong>: results commit in program order; a store sits in the store buffer before reaching L1.</li></ol>
<p>Key insight: the arithmetic is nearly free — the cost is dominated by <strong>where the data lives</strong> (register, L1, DRAM). That is why data layout and locality matter more than instruction counts in backend performance work.</p>`
        },
        {
          q: 'CISC vs RISC: does the distinction still matter for a backend engineer?',
          a: `<p>Mostly no for performance, yes for correctness and cost:</p>
<ul><li><strong>Convergence</strong>: x86-64 decodes to RISC-like micro-ops; ARM64 cores (Graviton, Apple M-series) are wide out-of-order designs. Performance depends on microarchitecture, caches and memory bandwidth more than on the ISA label.</li>
<li><strong>Memory model</strong>: x86 is TSO (only store→load reordering is visible). ARM is weakly ordered (loads and stores can be reordered). A racy "flag + data" handoff that works on x86 can read stale data on ARM. Go's <code>sync</code>/<code>sync/atomic</code> emit the correct barriers on each ISA; run <code>go test -race</code>.</li>
<li><strong>Operations</strong>: multi-arch container images, cgo dependencies needing ARM builds, and benchmarking on the target instance type.</li>
<li><strong>Cost</strong>: ARM cloud instances often give better price/performance, a common migration project.</li></ul>`
        },
        {
          q: 'Explain two\'s complement. Why does every modern CPU use it, and what does Go do on overflow?',
          a: `<p>In two's complement the most significant bit has negative weight (−2<sup>n−1</sup>); negation is <code>^x + 1</code>. Benefits: a single zero, a contiguous range [−2<sup>n−1</sup>, 2<sup>n−1</sup>−1], and the <strong>same adder</strong> works for signed and unsigned values — the CPU just sets both a carry flag (unsigned overflow) and an overflow flag (signed overflow).</p>
<p>Go semantics:</p>
<ul><li>Run-time overflow <strong>wraps</strong> silently and deterministically for all integer types (C leaves signed overflow undefined, which lets compilers delete your overflow checks).</li>
<li>Constant overflow is a compile error.</li>
<li>Division by zero panics; <code>MinInt64 / -1 == MinInt64</code>.</li>
<li>Detection: pre-check bounds, use <code>math/bits.Add64/Mul64</code>, or widen the type.</li></ul>
<p>Mention real bugs: binary-search midpoint, unsigned length subtraction (<code>uint(len(a)) - uint(len(b))</code> becomes huge), and timestamp/counter wrap-around.</p>`
        },
        {
          q: 'Why is floating point dangerous in backend systems, and how do you handle money, IDs and comparisons?',
          a: `<p>IEEE 754 doubles have a 53-bit significand, so most decimal fractions (0.1) are approximations, integers above 2<sup>53</sup> are rounded, and addition is not associative.</p>
<table><thead><tr><th>Concern</th><th>Approach</th></tr></thead><tbody>
<tr><td>Money</td><td>int64 minor units or a decimal type; explicit rounding modes; NUMERIC in the DB</td></tr>
<tr><td>IDs / large ints in JSON</td><td>Encode as strings (<code>json:"id,string"</code>), decode with <code>UseNumber</code></td></tr>
<tr><td>Equality</td><td>Relative + absolute tolerance, never <code>==</code></td></tr>
<tr><td>Aggregation</td><td>Kahan/pairwise summation, fixed order for reproducibility</td></tr>
<tr><td>Invalid values</td><td>Check <code>math.IsNaN</code>/<code>IsInf</code> at boundaries; NaN breaks maps and sorting</td></tr>
</tbody></table>
<p>Floats are fine for metrics, latencies and ML scores where small relative error is acceptable — the skill is knowing which domain you're in.</p>`
        }
      ],
      quiz: [
        { q: 'What is the von Neumann bottleneck?', a: 'Code and data share one path to memory, so the CPU can compute much faster than memory can supply instructions and data; caches exist to hide this gap.' },
        { q: 'How many bits does one hex digit represent?', a: 'Exactly 4 bits, so one byte is two hex digits (0x00 to 0xFF).' },
        { q: 'What is the range of an int8 in two\'s complement?', a: '-128 to 127.' },
        { q: 'What does Go do when a signed integer overflows at run time?', a: 'It wraps around silently (defined behaviour); there is no panic. Constant overflow is a compile-time error.' },
        { q: 'Up to what integer can a float64 represent every integer exactly?', a: '2^53 (9,007,199,254,740,992).' },
        { q: 'Which byte order do x86-64 and network protocols use?', a: 'x86-64 (and ARM64 as normally run) is little-endian; network byte order is big-endian.' },
        { q: 'Why can field order change the size of a Go struct?', a: 'The compiler inserts padding so each field is aligned to its size; ordering fields from largest to smallest minimises padding.' },
        { q: 'Which memory model is stronger, x86-64 or ARM64?', a: 'x86-64 (TSO) is stronger; ARM64 is weakly ordered, so missing synchronization shows up more readily on ARM.' }
      ],
      resources: [
        { title: 'OSTEP — Operating Systems: Three Easy Pieces (free book)', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/', type: 'book' },
        { title: 'A Quick Guide to Go\'s Assembler', url: 'https://go.dev/doc/asm', type: 'docs' },
        { title: 'Ulrich Drepper — What Every Programmer Should Know About Memory', url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf', type: 'article' }
      ]
    },
    // ───────────────────────────── Module 2 ─────────────────────────────
    {
      n: 2,
      title: 'CPU Internals & Performance',
      summary: 'What really determines how fast code runs on a modern core: IPC, pipelines, out-of-order and speculative execution, branch prediction, SIMD, SMT and the laws that cap parallel speedup.',
      topics: [
        {
          title: 'Clock Speed, CPI/IPC & the Performance Equation',
          def: `<p>The <strong>iron law of processor performance</strong>:</p>
<p><code>CPU time = Instruction count × CPI × Clock period = Instructions / (IPC × Frequency)</code></p>
<ul><li><strong>Clock frequency</strong>: a 3 GHz core ticks every ~0.33 ns. Frequencies plateaued around 3–5 GHz in the mid-2000s when <em>Dennard scaling</em> ended (power density became the limit), so vendors added cores instead.</li>
<li><strong>CPI / IPC</strong> (cycles per instruction / instructions per cycle): a modern core can retire 4–8 instructions per cycle in ideal conditions. Real server workloads often achieve IPC of 0.5–2; memory-bound code can drop below 0.3 because the core is <em>stalled</em> waiting for DRAM.</li>
<li><strong>Instruction count</strong> depends on the algorithm, compiler and ISA.</li></ul>
<table><thead><tr><th>IPC (from <code>perf stat</code>)</th><th>Typical meaning</th><th>Where to look</th></tr></thead><tbody>
<tr><td>&lt; 1.0</td><td>Stall-bound: cache/TLB misses, branch mispredicts</td><td>Data layout, locality, pointer chasing</td></tr>
<tr><td>1.0 – 2.5</td><td>Reasonable mix</td><td>Algorithmic work, allocation</td></tr>
<tr><td>&gt; 2.5</td><td>Compute-bound, well-predicted</td><td>Do less work, SIMD, better algorithm</td></tr>
</tbody></table>
<p>The equation explains why "a faster CPU" rarely fixes a slow service: if IPC is 0.4 because of cache misses, doubling frequency barely helps, while fixing data layout can triple throughput. It also explains why <em>CPU utilisation</em> is misleading — a core at 100% "busy" may be spending most of its cycles stalled on memory.</p>
<p><strong>Go connection:</strong> <code>pprof</code> shows <em>where</em> time goes; <code>perf stat</code> on the Go binary shows <em>why</em> (IPC, cache misses, branch misses).</p>`,
          interview: 'Quote the iron law (time = instructions x CPI x cycle time), say what low vs high IPC implies, and point out that "100% CPU" can mean "100% stalled on memory". Interviewers like candidates who reach for perf stat to read IPC before optimising.',
          examples: [
            {
              label: 'Read IPC, branch and cache misses with perf stat',
              lang: 'bash',
              code: `$ perf stat -e cycles,instructions,branches,branch-misses,cache-references,cache-misses ./orders-bench

 Performance counter stats for './orders-bench':

    9,412,334,120      cycles
    3,731,553,442      instructions              #    0.40  insn per cycle
      804,118,876      branches
       61,610,233      branch-misses             #    7.66% of all branches
      402,881,312      cache-references
      188,877,410      cache-misses              #   46.88% of all cache refs

      3.137451236 seconds time elapsed

# IPC 0.40 + ~47% cache-miss rate: memory-bound. Fix layout/locality first;
# a faster clock would barely help.`
            }
          ]
        },
        {
          title: 'Pipelining & Hazards',
          def: `<p>A <strong>pipeline</strong> overlaps instructions like an assembly line. The classic 5-stage RISC pipeline is <strong>IF</strong> (fetch) → <strong>ID</strong> (decode/read registers) → <strong>EX</strong> (execute) → <strong>MEM</strong> (memory access) → <strong>WB</strong> (write back). Each instruction still takes 5 cycles (<em>latency</em>), but one completes every cycle (<em>throughput</em>). Modern x86/ARM cores have 10–20+ stages.</p>
<p><strong>Hazards</strong> stop the next instruction from proceeding:</p>
<table><thead><tr><th>Hazard</th><th>Cause</th><th>Mitigation</th></tr></thead><tbody>
<tr><td>Structural</td><td>Two instructions need the same hardware unit</td><td>Duplicate units, split I/D caches</td></tr>
<tr><td>Data (RAW)</td><td>Instruction needs a result not yet written</td><td><strong>Forwarding/bypassing</strong>; stall for load-use</td></tr>
<tr><td>Data (WAR/WAW)</td><td>Reuse of the same register name</td><td>Register renaming (out-of-order cores)</td></tr>
<tr><td>Control</td><td>Branch target unknown until EX</td><td>Branch prediction + speculation</td></tr>
</tbody></table>
<p>A <strong>load-use hazard</strong> (using a value right after loading it) costs at least one bubble even with forwarding; if the load misses L1, the bubble becomes tens to hundreds of cycles. A <strong>branch mispredict</strong> flushes every instruction fetched down the wrong path — roughly 15–20 cycles on modern deep pipelines.</p>
<p>The lesson for software: long chains of <em>dependent</em> operations (each needs the previous result) cannot overlap and run at the latency of the slowest step; <em>independent</em> operations can fill the pipeline. That's why splitting a reduction into several accumulators, or iterating an array instead of a linked list, can give multi-x speedups with identical instruction counts.</p>`,
          interview: 'Be able to draw the 5-stage pipeline, name the three hazard types with a mitigation for each, and explain latency vs throughput of a pipeline. The follow-up is usually: why does a branch mispredict cost ~15-20 cycles (pipeline flush) and why do dependency chains limit speed?',
          examples: [
            {
              label: 'Pipeline timing with a load-use hazard',
              lang: 'text',
              code: `Cycle:              1    2    3    4    5    6    7    8
LOAD r1, [r2]       IF   ID   EX   MEM  WB
ADD  r3, r1, r4          IF   ID   --   EX   MEM  WB        <- 1-cycle bubble:
                                   ^stall                     r1 only available after MEM,
                                                              then forwarded to EX
SUB  r5, r6, r7               IF   --   ID   EX   MEM  WB

Without forwarding the ADD would wait until r1 is written back (2 bubbles).
If the LOAD misses in L1 and goes to DRAM (~100 ns = ~300 cycles at 3 GHz)
an in-order pipeline stalls for the whole miss; out-of-order cores keep
executing independent instructions (like SUB) while they wait.`
            }
          ]
        },
        {
          title: 'Superscalar, Out-of-Order & Speculative Execution',
          def: `<p><strong>Superscalar</strong> cores decode and issue several instructions per cycle across multiple execution ports (ALUs, load/store units, vector units). <strong>Out-of-order (OoO) execution</strong> lets the core run instructions as soon as their inputs are ready rather than in program order:</p>
<ul><li><strong>Register renaming</strong> maps the 16/31 architectural registers onto hundreds of physical registers, removing false (WAR/WAW) dependencies.</li>
<li>Micro-ops wait in a <strong>scheduler</strong> (reservation stations) until operands are ready.</li>
<li>The <strong>reorder buffer (ROB)</strong>, with several hundred entries, retires results <em>in program order</em> so exceptions and interrupts stay precise.</li>
<li><strong>Speculative execution</strong> runs past predicted branches; wrong-path work is discarded.</li></ul>
<p><strong>Memory-level parallelism (MLP)</strong> is the big win for backend code: when loads are independent, an OoO core can have 10–20+ cache misses in flight at once. Iterating a slice issues independent loads; walking a linked list or tree is <strong>pointer chasing</strong> — each address depends on the previous load, so misses are serialised. Same big-O, often 5–20× different speed.</p>
<p><strong>Spectre and Meltdown</strong> (2018) showed that speculative execution leaves traces in the cache that can be measured to leak secrets across security boundaries. Mitigations (KPTI page-table isolation, retpolines, IBRS) made <em>system calls and context switches noticeably more expensive</em> — one more reason to batch syscalls.</p>
<p>Visible effects in Go: independent accumulators beat a single running sum, slices beat linked lists, and <code>map</code> lookups (hashing + random memory access) cost far more than indexing a slice.</p>`,
          interview: 'Explain renaming, the ROB and speculation at a high level, then pivot to what matters for software: memory-level parallelism (independent loads overlap, pointer chasing does not) and that Spectre mitigations increased syscall/context-switch cost.',
          examples: [
            {
              label: 'Breaking a dependency chain (measured ~3x faster)',
              lang: 'go',
              code: `// Each s += v depends on the previous s: the loop runs at FP-add *latency*
// (~4 cycles per element). Go never reassociates float math, so it can't fix this.
func sum1(a []float64) float64 {
    s := 0.0
    for _, v := range a {
        s += v
    }
    return s
}

// Four independent chains: the OoO core overlaps them, approaching FP-add
// *throughput*. (Result may differ in the last bits: FP is not associative.)
func sum4(a []float64) float64 {
    var s0, s1, s2, s3 float64
    i := 0
    for ; i+4 <= len(a); i += 4 {
        s0 += a[i]
        s1 += a[i+1]
        s2 += a[i+2]
        s3 += a[i+3]
    }
    for ; i < len(a); i++ {
        s0 += a[i]
    }
    return (s0 + s1) + (s2 + s3)
}

// go test -bench Sum   (64K float64s, Intel Core Ultra 7)
// BenchmarkSum1-22    55482 ns/op
// BenchmarkSum4-22    16900 ns/op`
            }
          ]
        },
        {
          title: 'Branch Prediction (and Why Sorted Data Is Faster)',
          def: `<p>Deep pipelines must fetch the next instruction before a branch is resolved, so the core <strong>predicts</strong> the direction and target. Modern predictors (TAGE-like, using global branch history) are 95–99%+ accurate on regular patterns. A <strong>mispredict</strong> flushes the pipeline: ~15–20 cycles lost.</p>
<p>The famous experiment: filter values <code>&gt;= 128</code> from random bytes. With <strong>unsorted</strong> data the branch is a coin flip (~50% mispredicts). With <strong>sorted</strong> data it is "not taken" for the first half and "taken" for the second — almost perfectly predictable. Same instructions, ~5–8× faster.</p>
<table><thead><tr><th>Technique</th><th>Idea</th></tr></thead><tbody>
<tr><td>Sort / partition data</td><td>Make branch outcomes predictable</td></tr>
<tr><td>Branchless code</td><td>Turn control flow into data flow (CMOV, arithmetic masks)</td></tr>
<tr><td>Hoist rare cases</td><td>Check errors once outside the hot loop</td></tr>
<tr><td>Table lookups</td><td>Replace switch chains on random input</td></tr>
<tr><td>PGO</td><td>Go 1.21+ profile-guided optimisation improves inlining and layout of hot paths</td></tr>
</tbody></table>
<p><strong>Go caveat:</strong> the Go compiler already converts simple patterns like <code>if v &gt;= 128 { n += v }</code> into a conditional move, so that microbenchmark shows <em>no</em> difference in Go. Branches with side effects (appending, storing, calling) remain real branches and show the full effect. Always measure; don't assume.</p>
<p>Branchless code is not always faster: when a branch is well predicted, the branchy version can skip work, while CMOV always pays for both sides and creates a data dependency.</p>`,
          interview: 'This is a favourite: explain prediction, the mispredict penalty (pipeline flush), and why sorting makes the branch predictable. Bonus points: know that compilers may emit CMOV (so the effect can vanish), that branchless code trades control dependency for data dependency, and that you would confirm with perf stat branch-misses.',
          examples: [
            {
              label: 'Sorted vs unsorted filter, and a branchless version',
              lang: 'go',
              code: `// data: 64K random ints in [0,256)
func filterBig(data, out []int) []int {
    out = out[:0]
    for _, v := range data {
        if v >= 128 { // unpredictable on random data
            out = append(out, v)
        }
    }
    return out
}

// Branchless: always store, conditionally advance (needs cap(out) >= len(data)).
func filterBranchless(data, out []int) []int {
    out = out[:cap(out)]
    j := 0
    for _, v := range data {
        out[j] = v
        j += int(uint(127-v) >> 63) // 1 when v >= 128, else 0
    }
    return out[:j]
}

// go test -bench Filter (Intel Core Ultra 7, Go 1.2x)
// BenchmarkFilterUnsorted-22             314844 ns/op   <- ~50% mispredicts
// BenchmarkFilterSorted-22                41221 ns/op   <- 7.6x faster
// BenchmarkFilterBranchlessUnsorted-22    42393 ns/op   <- order no longer matters
// BenchmarkFilterBranchlessSorted-22      46914 ns/op`
            }
          ]
        },
        {
          title: 'SIMD, Multi-Core, SMT & Power Limits',
          def: `<p><strong>SIMD</strong> (Single Instruction, Multiple Data) applies one operation to a whole vector register: 128-bit SSE/NEON (4 float32s), 256-bit AVX2 (8), 512-bit AVX-512 (16), or length-agnostic ARM SVE. It powers memcpy, string search, JSON parsing (simdjson), hashing, compression and crypto (AES-NI, SHA extensions).</p>
<ul><li>The Go compiler does little auto-vectorisation; hot standard-library routines (<code>bytes.IndexByte</code>, <code>bytes.Equal</code>, <code>crypto/aes</code>, <code>crc32</code>) are hand-written assembly. Go 1.26 added an experimental <code>simd/archsimd</code> package (<code>GOEXPERIMENT=simd</code>, amd64).</li>
<li>SIMD needs contiguous, homogeneous data — struct-of-arrays layouts vectorise; slices of pointers do not.</li></ul>
<p><strong>Multi-core vs SMT</strong>:</p>
<table><thead><tr><th></th><th>Physical core</th><th>SMT / Hyper-Thread</th></tr></thead><tbody>
<tr><td>Owns</td><td>Pipeline, execution units, L1/L2</td><td>Only architectural state (registers, PC)</td></tr>
<tr><td>Shares</td><td>L3, memory bandwidth</td><td>Everything in the core with its sibling</td></tr>
<tr><td>Throughput gain</td><td>~1× per core added (ideal)</td><td>~0–30%; fills stall cycles of the sibling</td></tr>
</tbody></table>
<p>On most x86 cloud instances a <strong>vCPU is one hyper-thread</strong>, so 2 vCPUs = 1 physical core. Exceptions matter when you compare prices: ARM instances (AWS Graviton, Google Axion, Azure Cobalt) have no SMT, so a vCPU is a full core, and AWS also disables SMT on its 7th-generation-and-later AMD families (m7a/c7a/r7a and successors), so there too a vCPU is a full core. Check <code>lscpu</code> ("Thread(s) per core") rather than assuming. <code>GOMAXPROCS</code> defaults to the number of logical CPUs, and since Go 1.25 it also respects the container's cgroup CPU limit.</p>
<p><strong>Current server landscape (2026)</strong>: core counts exploded while per-core speed grew slowly. AMD EPYC 9005 (Zen 5 / dense Zen 5c) reaches 192 cores per socket; Intel Xeon 6 ships separate P-core (Granite Rapids, up to 128 cores) and E-core (Sierra Forest, up to 288 small cores, no SMT) parts; ARM Neoverse designs (Graviton4 with 96 cores, Axion, Cobalt 100) dominate price/performance. Wide cores retire up to ~8 instructions per cycle, but memory bandwidth per core has <em>not</em> kept pace, so locality matters more each generation. Laptops and desktops are <em>hybrid</em> (P-cores + E-cores): a benchmark on a developer laptop can land on either kind of core, another reason to benchmark on the target instance type.</p>
<p><strong>Power and thermals</strong>: turbo frequency depends on how many cores are busy and on temperature; heavy AVX-512 use lowered clocks on older Intel parts; laptops and dense racks throttle. Consequences: benchmarks are noisy (pin CPUs, use the <code>performance</code> governor, repeat runs), and per-core speed drops as more cores become active.</p>`,
          interview: 'Know that SMT siblings share execution units (so 2 vCPUs on x86 cloud = 1 core), that GOMAXPROCS follows logical CPUs and (Go 1.25+) cgroup limits, and how thermal/turbo effects make benchmarks noisy. For SIMD, say where it is used (memcpy, JSON, crypto) and that it needs contiguous data.',
          examples: [
            {
              label: 'Inspect cores, threads and caches with lscpu',
              lang: 'bash',
              code: `$ lscpu | egrep 'Model name|^CPU\\(s\\)|Thread|Core\\(s\\)|Socket|NUMA node\\(s\\)|L1d|L2|L3|Flags' | cut -c1-90
CPU(s):                  16
Model name:              Intel(R) Xeon(R) Platinum 8488C
Thread(s) per core:      2          # SMT on: 16 vCPUs = 8 physical cores (e.g. m7i.4xlarge)
Core(s) per socket:      8
Socket(s):               1
L1d cache:               384 KiB (8 instances)
L2 cache:                16 MiB (8 instances)
L3 cache:                105 MiB (1 instance)
NUMA node(s):            1
Flags:                   ... sse4_2 avx avx2 avx512f ... sha_ni aes ...

$ cat /sys/devices/system/cpu/cpu0/topology/thread_siblings_list
0,8                                 # cpu0 and cpu8 share one physical core

# Same vCPU count on an AWS m7a (AMD, SMT disabled) or Graviton instance:
Thread(s) per core:      1          # 16 vCPUs = 16 physical cores`
            }
          ]
        },
        {
          title: 'Amdahl\'s Law & Gustafson\'s Law',
          def: `<p><strong>Amdahl's law</strong> (fixed problem size): if a fraction <code>p</code> of the work can be parallelised across <code>n</code> processors,</p>
<p><code>Speedup(n) = 1 / ((1 − p) + p / n)</code>, and as n → ∞, <code>Speedup → 1 / (1 − p)</code>.</p>
<table><thead><tr><th>Parallel fraction p</th><th>n = 8</th><th>n = 64</th><th>Limit</th></tr></thead><tbody>
<tr><td>50%</td><td>1.78×</td><td>1.97×</td><td>2×</td></tr>
<tr><td>90%</td><td>4.7×</td><td>8.8×</td><td>10×</td></tr>
<tr><td>95%</td><td>5.9×</td><td>15.4×</td><td>20×</td></tr>
<tr><td>99%</td><td>7.5×</td><td>39.3×</td><td>100×</td></tr>
</tbody></table>
<p><strong>Gustafson's law</strong> (scaled problem size): in practice we use more cores to solve <em>bigger</em> problems in the same time. If the serial part stays fixed, <code>Scaled speedup = (1 − p) + p · n</code> — nearly linear. Amdahl answers "how fast can I make <em>this</em> job?"; Gustafson answers "how much more work can I handle?" — closer to how backend fleets scale with traffic.</p>
<p><strong>Beyond both</strong>: the <em>Universal Scalability Law</em> adds a coherence/crosstalk term, so throughput can actually <em>decrease</em> past some point (lock contention, cache-line ping-pong, cross-node coordination).</p>
<p>Backend translation of the serial fraction: a global mutex, a single-writer database primary, a leader in a consensus group, a hot partition key, or a sequential step in a request pipeline. Find and shrink these before adding cores or replicas — and remember that coordination itself (locks, cache coherence, network round-trips) adds cost that grows with n.</p>`,
          interview: 'Be ready to compute Amdahl numbers in your head (95% parallel caps at 20x), contrast with Gustafson (scale the problem, not the speedup), and map the serial fraction onto real systems: global locks, single DB primary, hot partitions. Mentioning USL (retrograde scaling) signals senior-level experience.',
          examples: [
            {
              label: 'Amdahl vs Gustafson calculator',
              lang: 'go',
              code: `package main

import "fmt"

func amdahl(p float64, n int) float64    { return 1 / ((1 - p) + p/float64(n)) }
func gustafson(p float64, n int) float64 { return (1 - p) + p*float64(n) }

func main() {
    for _, n := range []int{1, 8, 64, 1024} {
        fmt.Printf("n=%-5d amdahl(95%%)=%6.2fx  gustafson(95%%)=%8.2fx\\n",
            n, amdahl(0.95, n), gustafson(0.95, n))
    }
}

// n=1     amdahl(95%)=  1.00x  gustafson(95%)=    1.00x
// n=8     amdahl(95%)=  5.93x  gustafson(95%)=    7.65x
// n=64    amdahl(95%)= 15.42x  gustafson(95%)=   60.85x
// n=1024  amdahl(95%)= 19.64x  gustafson(95%)=  972.85x`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Compute CPU time with the performance equation',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>time = instructions × CPI / frequency.</li><li>Program: 2×10<sup>9</sup> instructions, CPI 1.5, 3 GHz. Then an optimisation cuts instructions by 20% but raises CPI to 1.8 — is it faster?</li></ul>`,
          solution: `Baseline: 2e9 * 1.5 / 3e9 = 1.0 s
Optimised: (0.8 * 2e9) * 1.8 / 3e9 = 1.6e9 * 1.8 / 3e9 = 0.96 s  -> 4% faster

Lesson: fewer instructions does not automatically mean faster. Replacing
a sequential scan with a pointer-heavy structure often lowers instruction
count but raises CPI (cache misses), and can lose overall.`,
          lang: 'text'
        },
        {
          t: 'Calculate the maximum speedup with Amdahl\'s law',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>A batch job: 10% is serial (reading a config, merging results), 90% parallel.</li><li>Speedup on 16 cores? On infinite cores?</li><li>What would you optimise first?</li></ul>`,
          solution: `Speedup(16) = 1 / (0.10 + 0.90/16) = 1 / (0.10 + 0.05625) = 6.4x
Speedup(inf) = 1 / 0.10 = 10x

Going from 16 to 64 cores only reaches 1/(0.1+0.014) = 8.8x.
Halving the serial part (10% -> 5%) gives 1/(0.05+0.95/16) = 9.1x on the SAME
16 cores -- better than quadrupling the hardware. Attack the serial fraction
(parallel merge, streaming results, removing a global lock) first.`,
          lang: 'text'
        },
        {
          t: 'Draw the pipeline diagram for dependent instructions',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>Use the 5-stage IF/ID/EX/MEM/WB pipeline.</li><li>Sequence: <code>LOAD r1,[r2]; ADD r3,r1,r1; MUL r4,r3,r5; SUB r6,r7,r8</code>.</li><li>Identify the RAW hazards; show stalls with and without forwarding.</li><li>Could reordering SUB earlier help?</li></ul>`,
          solution: `RAW hazards: ADD needs r1 (from LOAD), MUL needs r3 (from ADD). SUB is independent.

With forwarding:
           1   2   3   4   5   6   7   8   9
LOAD       IF  ID  EX  MEM WB
ADD            IF  ID  --  EX  MEM WB          (load-use: 1 bubble)
MUL                IF  --  ID  EX  MEM WB      (EX->EX forwarding: no extra stall)
SUB                    --  IF  ID  EX  MEM WB
Total: 9 cycles

Scheduling SUB right after LOAD fills the bubble:
LOAD, SUB, ADD, MUL -> 8 cycles, zero stalls.

Without forwarding, each RAW dependency waits for WB (2 bubbles each).
Compilers do this static scheduling; out-of-order cores do it dynamically.`,
          lang: 'text'
        },
        {
          t: 'Explain why iterating a slice is faster than a linked list of the same length',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>Both are O(n). What differs is the memory access pattern.</li><li>Think about prefetching, cache lines (8 ints per 64-byte line) and memory-level parallelism.</li><li>In a linked list, each next address depends on the previous load (pointer chasing).</li></ul>`,
          solution: `Slice:
- Elements are contiguous: one 64-byte cache line holds 8 int64s, so 1 miss
  per 8 elements; the hardware prefetcher detects the sequential stream.
- Loads are independent, so the OoO core keeps many in flight (MLP).
- Bounds-check-free loops can even be vectorised.

Linked list:
- Nodes are scattered across the heap (allocated at different times);
  each node can be a cache (and TLB) miss.
- The address of node i+1 is only known after loading node i: misses are
  serialised, ~80-100 ns each from DRAM. 1M nodes ~ 100 ms vs ~1 ms for a slice.
- Each node also carries pointer + allocation overhead and GC scanning cost.

Go takeaway: prefer slices (and slices of values, not pointers); container/list
is rarely the right choice.`,
          lang: 'text'
        },
        {
          t: 'Benchmark sorted vs unsorted branch behaviour in Go',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Generate 64K random ints in [0,256); filter values <code>&gt;= 128</code> into an output slice.</li><li>Benchmark with unsorted vs sorted input using <code>testing.B</code>.</li><li>Then try the simple <code>if v &gt;= 128 { sum += v }</code> — why might the difference disappear? Check with <code>go build -gcflags=-S</code> (look for CMOV).</li><li>Confirm with <code>perf stat -e branch-misses</code> on Linux.</li></ul>`,
          solution: `package bp

import (
    "math/rand"
    "slices"
    "testing"
)

const N = 1 << 16

func makeData(sorted bool) []int {
    r := rand.New(rand.NewSource(1))
    d := make([]int, N)
    for i := range d {
        d[i] = r.Intn(256)
    }
    if sorted {
        slices.Sort(d)
    }
    return d
}

func filterBig(data, out []int) []int {
    out = out[:0]
    for _, v := range data {
        if v >= 128 {
            out = append(out, v)
        }
    }
    return out
}

var sink int

func bench(b *testing.B, sorted bool) {
    d, out := makeData(sorted), make([]int, 0, N)
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        sink = len(filterBig(d, out))
    }
}

func BenchmarkUnsorted(b *testing.B) { bench(b, false) }
func BenchmarkSorted(b *testing.B)   { bench(b, true) }

// Typical result: Unsorted ~315 us/op, Sorted ~41 us/op (7-8x).
// A pure "sum += v" body compiles to CMOV in Go, so both run at the same speed:
// no branch, no misprediction -- always measure, never assume.`,
          lang: 'go'
        },
        {
          t: 'Make a hot loop branchless',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Turn the condition into a 0/1 integer using the sign bit: for small ints, <code>uint(127-v) &gt;&gt; 63</code> is 1 when <code>v &gt;= 128</code>.</li><li>Always write, conditionally advance the index.</li><li>When is branchless <em>slower</em>?</li></ul>`,
          solution: `// Count and clamp without branches.
func countGE(data []int, threshold int) int {
    n := 0
    for _, v := range data {
        // (threshold-1-v) is negative exactly when v >= threshold;
        // shifting the sign bit down yields 1 or 0. (Assumes no overflow.)
        n += int(uint(threshold-1-v) >> 63)
    }
    return n
}

// Branchless min for ints via mask (Go's built-in min() is usually compiled
// to CMOV already -- prefer it).
func minBranchless(a, b int) int {
    d := a - b
    mask := d >> 63 // all ones if a < b, else 0 (arithmetic shift)
    return b + (d & mask)
}

// Branchless filter: always store, advance j by 0 or 1.
func filter(data, out []int, threshold int) []int {
    out = out[:cap(out)] // caller guarantees cap(out) >= len(data)
    j := 0
    for _, v := range data {
        out[j] = v
        j += int(uint(threshold-1-v) >> 63)
    }
    return out[:j]
}

// Branchless is slower when the branch is highly predictable AND skips
// expensive work: the branchy version does the work rarely, the branchless
// one always pays for it.`,
          lang: 'go'
        },
        {
          t: 'Speed up a floating-point reduction by breaking the dependency chain',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>A single accumulator makes every add wait for the previous one (FP-add latency ~4 cycles).</li><li>Use 4–8 independent accumulators and combine at the end.</li><li>Why can't the Go compiler do this automatically for floats? (associativity)</li></ul>`,
          solution: `func sum8(a []float64) float64 {
    var s [8]float64
    i := 0
    for ; i+8 <= len(a); i += 8 {
        s[0] += a[i]
        s[1] += a[i+1]
        s[2] += a[i+2]
        s[3] += a[i+3]
        s[4] += a[i+4]
        s[5] += a[i+5]
        s[6] += a[i+6]
        s[7] += a[i+7]
    }
    for ; i < len(a); i++ {
        s[0] += a[i]
    }
    return ((s[0] + s[1]) + (s[2] + s[3])) + ((s[4] + s[5]) + (s[6] + s[7]))
}

// Measured: 1 accumulator ~55 us, 4 accumulators ~17 us for 64K float64s.
// The compiler may not reassociate FP adds (results would change), so it
// must keep the serial chain; you choose to accept a slightly different
// rounding in exchange for ~3x throughput. Pairwise grouping also tends to
// be MORE accurate than one long running sum.`,
          lang: 'go'
        },
        {
          t: 'Diagnose a service with low IPC and high CPU',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Start with <code>perf stat</code>: IPC, cache-misses, branch-misses, context switches.</li><li>Use <code>pprof</code> (CPU) to find hot functions, then <code>perf record</code>/<code>perf annotate</code> for instruction-level stalls.</li><li>Common culprits: map-heavy code, pointer-rich structs, large working sets, GC scanning.</li></ul>`,
          solution: `1. Confirm the symptom
   perf stat -p $(pgrep orders) -- sleep 30
   -> IPC 0.45, cache-misses 40% of refs, branch-misses 1%: memory-bound.

2. Locate hot code
   go tool pprof -http=: http://svc:6060/debug/pprof/profile?seconds=30
   -> 35% in mapaccess2 (map[string]*Order lookups), 20% in runtime.scanobject (GC).

3. Hypothesis: random access into a large pointer-heavy map (working set
   ~2 GB >> 32 MB L3) + GC scanning millions of pointers.

4. Fixes (measure each)
   - Key by int64 instead of string; store values not pointers
     (map[int64]Order) -> fewer cache lines touched, fewer pointers for GC.
   - Batch/sort lookups by key to improve locality.
   - Shrink structs (field ordering, smaller types) so more fit in cache.
   - Tune GOGC / GOMEMLIMIT if GC is significant.

5. Verify: IPC rose to 1.3, p99 latency -40%, CPU -30%.`,
          lang: 'text'
        },
        {
          t: 'Size CPU for a Go service on SMT cloud instances',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>On most x86 cloud instances, 1 vCPU = 1 hyper-thread; 2 vCPUs share one core's execution units (check <code>lscpu</code>: AWS AMD m7a-and-later and all ARM instances have no SMT).</li><li>How does <code>GOMAXPROCS</code> interact with Kubernetes CPU limits (CFS quota) — and what changed in Go 1.25?</li><li>Throttling: what happens when a process with 8 runnable threads has a 2-CPU quota?</li><li>Benchmark on the target instance family (ARM vs x86).</li></ul>`,
          solution: `Key facts
- x86 instances: 2 vCPUs = 1 physical core (SMT siblings share ALUs, L1, L2).
  A CPU-bound service may get only ~1.2-1.3x from the second sibling.
- Graviton/Axion/Cobalt (ARM) and AWS m7a/c7a/r7a+ (AMD, SMT off): 1 vCPU = 1 core,
  so per-vCPU throughput is higher and more predictable -- compare cost per
  request at the SLO, not price per vCPU.
- K8s CPU limits use the CFS bandwidth controller: quota per 100 ms period.
  If GOMAXPROCS=64 (host CPUs) and limit=2, 64 threads burn the 200 ms quota
  in ~3 ms of wall time and the container is THROTTLED for the rest of the
  period -> p99 latency spikes of tens of ms.

Design
1. Go 1.25+ (go.mod "go 1.25" or later): GOMAXPROCS defaults to
   min(logical CPUs, affinity mask, ceil(cgroup quota/period)) -- never below 2
   -- and is updated if the limit changes. Older Go: use
   go.uber.org/automaxprocs or set GOMAXPROCS explicitly.
2. Watch container_cpu_cfs_throttled_periods_total; many teams set CPU
   requests but no limits for latency-sensitive services.
3. Load-test on the real instance family; capacity = throughput at the
   p99 SLO, not at 100% CPU. Keep ~30-40% headroom for GC bursts and failover.
4. Consider fewer, larger pods to amortise per-process overhead, vs more pods
   for fault isolation.`,
          lang: 'text'
        },
        {
          t: 'Explain why adding more workers reduced throughput',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Amdahl caps speedup, but cannot explain a <em>decrease</em>.</li><li>Think about contention (queueing on a lock) and coherence (cache-line ping-pong, cross-node coordination) — the Universal Scalability Law.</li><li>How would you measure where the time goes (mutex profile, perf c2c)?</li></ul>`,
          solution: `Observation: 8 workers -> 40k ops/s, 32 workers -> 31k ops/s.

USL: X(N) = lambda*N / (1 + sigma*(N-1) + kappa*N*(N-1))
- sigma (contention): time serialised on a shared resource (global mutex,
  single DB row, a channel everyone sends to).
- kappa (coherence/crosstalk): pairwise coordination cost growing with N^2:
  cache lines bouncing between cores (shared counters, false sharing),
  distributed locks, chatty consensus. kappa > 0 produces a peak, then decline.

Investigate
- go tool pprof /debug/pprof/mutex and /block: where goroutines wait.
- perf c2c (Linux) to find contended/false-shared cache lines.
- runtime/trace: goroutines runnable but not running (scheduler contention).

Fix
- Shard the state (per-CPU or per-key-hash shards), batch updates,
  replace a shared counter with per-worker counters summed on read,
  pad hot structs to separate cache lines, use lock-free reads (atomic.Pointer
  to an immutable snapshot), and cap the worker pool at the measured peak.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'Why is processing a sorted array faster than an unsorted one?',
          a: `<p>Because of <strong>branch prediction</strong>. The CPU pipeline fetches instructions 15–20 stages ahead of where branches are resolved, so it guesses the branch outcome and executes speculatively. A wrong guess flushes the pipeline (~15–20 cycles).</p>
<ul><li>Random data + <code>if v &gt;= 128</code>: outcome is a coin flip → ~50% mispredicts → most time is spent refilling the pipeline.</li>
<li>Sorted data: the branch is not-taken for a long run then taken for a long run → predictor is right &gt;99% of the time.</li></ul>
<p>Caveats a senior candidate mentions:</p>
<ul><li>Compilers (including Go's) may convert simple ifs into <strong>CMOV</strong>; then there is no branch and no difference.</li>
<li>Sorting costs O(n log n) — only worth it if data is reused, or if it also improves locality.</li>
<li>Measure with <code>perf stat -e branches,branch-misses</code>.</li>
<li>Fixes: branchless code, partitioning, moving rare checks out of hot loops, PGO.</li></ul>`
        },
        {
          q: 'What is out-of-order execution, and how does it relate to Spectre?',
          a: `<p>An OoO core fetches/decodes in order, then <strong>renames</strong> registers, places micro-ops in a scheduler and executes each as soon as its inputs are ready, possibly ahead of older stalled instructions (e.g. a cache miss). A <strong>reorder buffer</strong> retires results in program order, so the architectural state looks sequential and exceptions are precise. Combined with <strong>speculation</strong> past predicted branches, the core keeps hundreds of instructions in flight and overlaps many cache misses (memory-level parallelism).</p>
<p><strong>Spectre</strong>: speculative instructions are squashed architecturally, but their <em>micro-architectural side effects</em> (which cache lines were loaded) remain. An attacker trains the predictor so the victim speculatively reads a secret and uses it as an index into an array; timing which line is cached reveals the secret. <strong>Meltdown</strong> abused speculative loads of kernel memory from user mode.</p>
<p>Practical impact: KPTI (separate kernel/user page tables), retpolines and microcode barriers raised the cost of <strong>syscalls, context switches and indirect branches</strong>, which hurt syscall-heavy services — another reason to batch I/O and use efficient multiplexing (epoll, io_uring).</p>`
        },
        {
          q: 'Explain Amdahl\'s law and apply it to scaling a backend service.',
          a: `<p><code>Speedup = 1 / ((1 − p) + p/n)</code>. The serial fraction <code>(1 − p)</code> sets a hard ceiling: 5% serial work caps speedup at 20× regardless of cores.</p>
<p>In services, the "serial fraction" is anything everyone must go through:</p>
<ul><li>A global <code>sync.Mutex</code> around a cache or counter.</li>
<li>A single primary database / single Kafka partition / one leader.</li>
<li>A hot key or tenant hashed to one shard.</li>
<li>Sequential steps in a request (call A then B then C when they could be concurrent).</li></ul>
<p><strong>Gustafson's law</strong> is the optimistic counterpart: with more resources we usually process more <em>load</em>, not the same load faster, giving near-linear throughput scaling if the serial portion doesn't grow. The <strong>Universal Scalability Law</strong> adds coherence costs, explaining why throughput can <em>fall</em> when adding nodes or threads.</p>
<p>Approach: profile (mutex/block profiles, DB wait stats), shard or partition the serial resource, make independent calls concurrent (<code>errgroup</code>), and load-test to find the scaling knee.</p>`
        },
        {
          q: 'Is a vCPU a core? How do SMT and CPU limits affect a Go service?',
          a: `<p>On most x86 cloud instances, a vCPU is a <strong>hardware thread</strong>. Two SMT siblings share one core's execution units, L1 and L2 caches; together they typically deliver ~1.2–1.3× one thread, not 2×. On ARM instances (Graviton, Axion, Cobalt) and AWS's SMT-disabled AMD families (m7a and later) a vCPU is a full core, so "vCPU" prices are not directly comparable.</p>
<ul><li>Go runs at most <code>GOMAXPROCS</code> threads executing Go code simultaneously; the default is the number of logical CPUs visible.</li>
<li>In containers, CPU limits are enforced by CFS bandwidth control (quota per 100 ms period). If GOMAXPROCS is far above the limit, the process exhausts its quota early in each period and is <strong>throttled</strong>, creating latency spikes. Go 1.25+ sets GOMAXPROCS from the cgroup limit automatically; older versions need <code>automaxprocs</code>.</li>
<li>Noisy neighbours on the sibling hyper-thread and turbo/thermal behaviour make per-request CPU time variable — benchmark on the actual instance type and plan with headroom.</li></ul>`
        }
      ],
      quiz: [
        { q: 'State the iron law of processor performance.', a: 'CPU time = instruction count x cycles per instruction x clock period (equivalently instructions / (IPC x frequency)).' },
        { q: 'What does an IPC of 0.3 usually indicate?', a: 'The core is mostly stalled, typically on cache/TLB misses (memory-bound) or frequent branch mispredicts.' },
        { q: 'Name the three types of pipeline hazards.', a: 'Structural, data (RAW, plus WAR/WAW name dependencies) and control hazards.' },
        { q: 'Roughly how many cycles does a branch mispredict cost on a modern core?', a: 'About 15-20 cycles, because the pipeline must be flushed and refilled.' },
        { q: 'What does the reorder buffer guarantee?', a: 'That instructions executed out of order still retire (commit) in program order, keeping architectural state and exceptions precise.' },
        { q: 'Why is pointer chasing slow even on an out-of-order CPU?', a: 'Each load address depends on the previous load, so cache misses cannot overlap (no memory-level parallelism).' },
        { q: 'With 95% parallel code, what is the maximum speedup by Amdahl\'s law?', a: '20x (1 / 0.05), no matter how many processors.' },
        { q: 'On a typical x86 cloud VM, what is a vCPU?', a: 'One SMT hardware thread (hyper-thread); two vCPUs share a physical core. Exceptions: ARM instances and AWS AMD m7a-and-later families have SMT off, so a vCPU is a full core.' }
      ],
      resources: [
        { title: 'Ulrich Drepper — What Every Programmer Should Know About Memory', url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf', type: 'article' },
        { title: 'Brendan Gregg — Linux perf Examples', url: 'https://www.brendangregg.com/perf.html', type: 'article' },
        { title: 'Go Diagnostics (profiling, tracing)', url: 'https://go.dev/doc/diagnostics', type: 'docs' },
        { title: 'Go Profile-Guided Optimization', url: 'https://go.dev/doc/pgo', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 3 ─────────────────────────────
    {
      n: 3,
      title: 'Memory Hierarchy & Caches',
      summary: 'Why memory access patterns, not instruction counts, dominate performance: latency numbers, cache lines and locality, associativity and misses, coherence (MESI), false sharing, NUMA, prefetching and data-oriented layouts.',
      topics: [
        {
          title: 'The Memory Hierarchy & Latency Numbers',
          def: `<p>Fast memory is small and expensive; big memory is slow and cheap. Hardware therefore builds a <strong>hierarchy</strong> where each level caches the one below it. Approximate figures for a modern server core (~3 GHz):</p>
<table><thead><tr><th>Level</th><th>Typical size</th><th>Latency</th><th>If L1 = 1 second…</th></tr></thead><tbody>
<tr><td>Registers</td><td>16–31 GPRs + vector regs</td><td>0 cycles</td><td>—</td></tr>
<tr><td>L1 data cache</td><td>32–48 KiB per core</td><td>~4–5 cycles (~1 ns)</td><td>1 s</td></tr>
<tr><td>L2 cache</td><td>1–2 MiB per core</td><td>~12–16 cycles (~4 ns)</td><td>4 s</td></tr>
<tr><td>L3 (LLC)</td><td>32–100+ MiB shared</td><td>~40–70 cycles (~15 ns)</td><td>15 s</td></tr>
<tr><td>DRAM (local)</td><td>64 GiB – TiBs</td><td>~80–120 ns</td><td>~1.5–2 min</td></tr>
<tr><td>DRAM (remote NUMA)</td><td>other socket</td><td>~130–200 ns</td><td>~3 min</td></tr>
<tr><td>NVMe SSD read</td><td>TBs</td><td>~20–100 µs</td><td>~1 day</td></tr>
<tr><td>Same-DC network RTT</td><td>—</td><td>~200–500 µs</td><td>~4 days</td></tr>
<tr><td>HDD seek</td><td>TBs</td><td>~5–10 ms</td><td>~4 months</td></tr>
</tbody></table>
<p><strong>Bandwidth</strong> also falls with distance: L1 can deliver ~100–200+ GB/s per core; a current 12-channel DDR5 socket (EPYC 9005, Xeon 6) peaks around ~450–600 GB/s, but it is shared by 100+ cores, so under full load each core gets only a few GB/s, and a single core streaming alone tops out around ~10–30 GB/s (limited by how many misses it can keep in flight). A PCIe 4/5 NVMe drive delivers ~7–14 GB/s sequential.</p>
<p>The hierarchy works because of <strong>locality</strong>: programs tend to reuse recent data (temporal) and touch neighbouring addresses (spatial). Your code's job is to keep the <em>working set</em> of hot data small and contiguous enough to stay high in the hierarchy.</p>
<p><strong>Backend relevance:</strong> a DRAM miss costs ~300 cycles — the time to execute ~1000 instructions. A map lookup in a 2 GB in-memory cache is likely several misses (hash bucket, key, value, plus a TLB miss). The same thinking scales up: in-process cache (ns) → Redis over the network (~0.5 ms) → database on SSD (ms).</p>`,
          interview: 'Memorise the orders of magnitude (L1 ~1 ns, L2 ~4 ns, L3 ~15 ns, DRAM ~100 ns, SSD ~100 us, same-DC RTT ~0.5 ms, HDD ~10 ms) and use them in design estimates. Interviewers want to see you reason "this is a DRAM miss per item, so 10M items is ~1 s".',
          examples: [
            {
              label: 'Inspect cache hierarchy on Linux',
              lang: 'bash',
              code: `$ getconf -a | grep -i CACHE
LEVEL1_DCACHE_SIZE                 49152
LEVEL1_DCACHE_ASSOC                12
LEVEL1_DCACHE_LINESIZE             64
LEVEL2_CACHE_SIZE                  2097152
LEVEL2_CACHE_ASSOC                 16
LEVEL2_CACHE_LINESIZE              64
LEVEL3_CACHE_SIZE                  110100480
LEVEL3_CACHE_ASSOC                 15
LEVEL3_CACHE_LINESIZE              64

$ cat /sys/devices/system/cpu/cpu0/cache/index0/{level,type,size,ways_of_associativity,coherency_line_size}
1
Data
48K
12
64`
            }
          ]
        },
        {
          title: 'Cache Lines & Locality (Row-Major vs Column-Major)',
          def: `<p>Caches move data in fixed blocks called <strong>cache lines</strong> — <strong>64 bytes</strong> on x86-64 and most ARM server cores (Apple M-series uses 128 bytes). Reading one byte pulls in the whole line, so:</p>
<ul><li><strong>Spatial locality</strong>: after touching <code>a[i]</code>, <code>a[i+1]</code> is probably already cached. A 64-byte line holds 16 <code>int32</code>s or 8 <code>int64</code>s/pointers.</li>
<li><strong>Temporal locality</strong>: data used recently is likely to be used again soon, so keep the working set small enough to stay cached.</li></ul>
<p><strong>Row-major vs column-major</strong>: Go, C and most languages store 2-D arrays row by row. Iterating rows in the inner loop walks memory sequentially (1 miss per 16 <code>int32</code>s, and the prefetcher streams ahead). Iterating columns in the inner loop jumps by a whole row each step: every access is a new cache line, often a new page (TLB miss), and with power-of-two row sizes many lines map to the same cache set (conflict misses).</p>
<table><thead><tr><th>4096×4096 int32 sum (Go, measured)</th><th>Time</th></tr></thead><tbody>
<tr><td>Row-major (inner loop over columns)</td><td>~12 ms</td></tr>
<tr><td>Column-major (inner loop over rows)</td><td>~248 ms (~20× slower)</td></tr>
</tbody></table>
<p><strong>Go notes</strong>:</p>
<ul><li><code>[][]T</code> is a slice of separately allocated rows — rows are not contiguous with each other. For dense matrices use one flat <code>[]T</code> indexed <code>r*cols + c</code>.</li>
<li><code>[]T</code> of values is contiguous; <code>[]*T</code> is an array of pointers to scattered heap objects (extra miss per element, plus GC scanning).</li>
<li>Loop tiling (blocking) processes a sub-matrix that fits in cache — the trick behind fast matrix multiply and transposes.</li></ul>`,
          interview: 'The row-major vs column-major question is a staple: answer with cache lines (64 B), sequential prefetching, TLB misses and conflict misses, and give the order of magnitude (10-20x). Then generalise: prefer contiguous slices of values, flat arrays for matrices, and tiling for 2-D algorithms.',
          examples: [
            {
              label: 'Row-major vs column-major traversal benchmark',
              lang: 'go',
              code: `const R, C = 4096, 4096

var grid = make([]int32, R*C) // flat, row-major: element (r,c) at r*C + c

func BenchmarkRowMajor(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var s int32
        for r := 0; r < R; r++ {
            for c := 0; c < C; c++ { // sequential addresses: stride 4 bytes
                s += grid[r*C+c]
            }
        }
        sink = int(s)
    }
}

func BenchmarkColMajor(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var s int32
        for c := 0; c < C; c++ {
            for r := 0; r < R; r++ { // stride 16 KiB: new line + new page each step
                s += grid[r*C+c]
            }
        }
        sink = int(s)
    }
}

// BenchmarkRowMajor-22     5    11601400 ns/op
// BenchmarkColMajor-22     5   248417220 ns/op   (~21x slower, same work)`
            }
          ]
        },
        {
          title: 'Cache Organisation: Associativity, Misses & Write Policies',
          def: `<p>A cache is split into <strong>sets</strong>; each set holds <em>N</em> lines (<strong>N-way set associative</strong>). An address is divided into <code>tag | index | offset</code>: the offset selects the byte within the 64-byte line (6 bits), the index selects the set, and the tag identifies which memory line is stored there.</p>
<table><thead><tr><th>Organisation</th><th>Where can a line go?</th><th>Trade-off</th></tr></thead><tbody>
<tr><td>Direct-mapped</td><td>Exactly one slot</td><td>Fast, cheap, many conflicts</td></tr>
<tr><td>N-way set associative</td><td>Any of N slots in one set</td><td>Common: L1 8–12 way, L3 11–16 way</td></tr>
<tr><td>Fully associative</td><td>Anywhere</td><td>Expensive; used for small TLBs</td></tr>
</tbody></table>
<p>Example: 48 KiB, 12-way, 64 B lines → 768 lines / 12 = 64 sets → 6 offset bits + 6 index bits. Addresses that differ by a multiple of 4096 bytes land in the <em>same set</em>, so striding by 4 KiB (columns of a power-of-two matrix, page-aligned buffers) thrashes just 12 slots.</p>
<p><strong>The 3 Cs of misses</strong> (+1):</p>
<ul><li><strong>Compulsory (cold)</strong>: first touch of a line. Reduced by prefetching and larger lines.</li>
<li><strong>Capacity</strong>: working set exceeds the cache. Reduced by shrinking/tiling data.</li>
<li><strong>Conflict</strong>: too many hot lines map to one set. Reduced by higher associativity, padding, avoiding power-of-two strides.</li>
<li><strong>Coherence</strong>: another core invalidated the line (true or false sharing).</li></ul>
<p><strong>Write policies</strong>: <em>write-through</em> updates the next level on every write (simple, more traffic); <em>write-back</em> marks the line dirty and writes it only on eviction (used by all modern CPU caches). On a write miss, <em>write-allocate</em> fetches the line first — the "read for ownership". Replacement is usually pseudo-LRU.</p>
<p>The same vocabulary applies to software caches (Redis, CDN, Go LRU): hit ratio, capacity vs conflict (hash-slot collisions), write-through vs write-back (write-behind) and eviction policy.</p>`,
          interview: 'Be able to split an address into tag/index/offset for a given cache, classify misses with the 3 Cs, and contrast write-back vs write-through. Connecting the concepts to software caches (write-through vs write-behind to a DB, eviction policies) is a strong signal in backend interviews.',
          examples: [
            {
              label: 'Address breakdown for a 48 KiB, 12-way, 64 B-line L1',
              lang: 'text',
              code: `lines  = 48 KiB / 64 B   = 768
sets   = 768 / 12 ways    = 64
offset = log2(64 B)       = 6 bits   (bits 0-5)
index  = log2(64 sets)    = 6 bits   (bits 6-11)
tag    = remaining bits   (bits 12-47 for 48-bit addresses)

addr 0x7ffd12345678
  offset = 0x678 & 0x3f        = 0x38 (56)
  index  = (0x678 >> 6) & 0x3f = 0x19 (25)
  tag    = addr >> 12          = 0x7ffd12345

Note: index+offset = 12 bits = 4 KiB page offset. Any addresses that are
4 KiB apart map to the same set -> at most 12 of them fit at once.`
            }
          ]
        },
        {
          title: 'Cache Coherence (MESI) & False Sharing',
          def: `<p>Each core has private L1/L2 caches, so the hardware must keep copies of the same line consistent. Most CPUs use a <strong>MESI</strong>-family protocol (Intel MESIF, AMD MOESI), enforced by snooping or a directory:</p>
<table><thead><tr><th>State</th><th>Meaning</th><th>Can write without bus traffic?</th></tr></thead><tbody>
<tr><td><strong>M</strong>odified</td><td>Only copy, dirty</td><td>Yes</td></tr>
<tr><td><strong>E</strong>xclusive</td><td>Only copy, clean</td><td>Yes (silently becomes M)</td></tr>
<tr><td><strong>S</strong>hared</td><td>Clean, other cores may have it</td><td>No — must invalidate others first</td></tr>
<tr><td><strong>I</strong>nvalid</td><td>Not usable</td><td>No — must fetch (RFO)</td></tr>
</tbody></table>
<p>To write, a core needs the line in M/E state, so it sends a <em>read-for-ownership</em> that invalidates all other copies. If two cores keep writing the same line, it <strong>ping-pongs</strong> between them, each transfer costing tens of nanoseconds (more across sockets).</p>
<p><strong>False sharing</strong> is when cores write <em>different</em> variables that happen to share one cache line. The program has no logical sharing, but the hardware coherence unit is the whole 64-byte line, so it behaves like heavy contention. Typical victims: per-worker counters in a slice or adjacent struct fields, a mutex next to hot data, ring-buffer head and tail indexes.</p>
<p><strong>Fixes</strong>: pad or align hot per-core data to separate lines (often 128 bytes, because Intel's adjacent-line prefetcher pulls pairs of lines); keep goroutine-local state on the goroutine stack and merge at the end; shard. The Go runtime itself pads per-P structures, and <code>golang.org/x/sys/cpu.CacheLinePad</code> provides a portable pad. Diagnose with <code>perf c2c</code> on Linux.</p>`,
          interview: 'Define MESI states, explain that a write requires ownership (invalidating other copies), then define false sharing as coherence traffic on a line shared by unrelated variables. Show the padding fix and say how you would detect it (perf c2c, benchmarks that scale badly with cores).',
          examples: [
            {
              label: 'Demonstrate and fix false sharing in Go (measured ~4x)',
              lang: 'go',
              code: `type Unpadded struct { // a and b share one 64-byte line
    a atomic.Int64
    b atomic.Int64
}

type Padded struct { // a and b on different lines
    a atomic.Int64
    _ [56]byte // or cpu.CacheLinePad from golang.org/x/sys/cpu
    b atomic.Int64
    _ [56]byte
}

const ops = 10_000_000

func BenchmarkFalseSharing(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var s Unpadded
        var wg sync.WaitGroup
        wg.Add(2)
        go func() { defer wg.Done(); for j := 0; j < ops; j++ { s.a.Add(1) } }()
        go func() { defer wg.Done(); for j := 0; j < ops; j++ { s.b.Add(1) } }()
        wg.Wait()
    }
}
// BenchmarkPadded: identical, using Padded.

// BenchmarkFalseSharing-22    5   303474900 ns/op
// BenchmarkPadded-22          5    78752860 ns/op   (~3.9x faster)`
            }
          ]
        },
        {
          title: 'NUMA & Hardware Prefetching',
          def: `<p><strong>NUMA</strong> (Non-Uniform Memory Access): in multi-socket servers (and chiplet CPUs with multiple memory controllers) each socket/node has its own <em>local</em> DRAM. Accessing another node's memory crosses the interconnect (Intel UPI, AMD Infinity Fabric) and costs ~1.3–2× the latency with lower bandwidth.</p>
<ul><li>Linux allocates physical pages with a <strong>first-touch</strong> policy: the page lands on the node of the CPU that first writes it. A single goroutine initialising a 100 GB cache puts it all on one node.</li>
<li>The Go runtime is <strong>not NUMA-aware</strong>: goroutines migrate freely between threads and cores.</li>
<li>Tools: <code>numactl --hardware</code>, <code>numastat</code>, <code>lscpu</code>. Mitigations: run one process per node (<code>numactl --cpunodebind=0 --membind=0</code>), interleave memory for large shared structures (<code>--interleave=all</code>), or use the Kubernetes Topology Manager (<code>single-numa-node</code>) with the static CPU manager for latency-critical pods.</li>
<li>Cloud: instances with up to roughly half a socket are usually single-node; the largest sizes (and bare-metal) expose multiple NUMA nodes.</li>
<li>One socket can also be several nodes: Intel <strong>Sub-NUMA Clustering</strong> (SNC) and AMD <strong>NPS</strong> (nodes per socket: NPS1/2/4) split a socket into quadrants with their own memory controllers. Lower local latency, but software must be NUMA-aware to benefit; check <code>numactl --hardware</code> even on a single-socket host.</li></ul>
<p><strong>Hardware prefetching</strong>: the CPU watches access patterns and fetches lines before they are requested. Prefetchers recognise sequential and constant-stride streams (forward or backward), and typically do not cross 4 KiB page boundaries. They cannot predict <em>pointer chasing</em> (linked lists, trees, maps), where the next address is data-dependent. Software prefetch instructions exist but are rarely worth it outside specialised code.</p>
<p>Design implication: sequential scans are close to memory bandwidth limits; random access is bound by latency. That is why B-trees with wide nodes, columnar storage and log-structured writes beat pointer-heavy structures at scale.</p>`,
          interview: 'Explain local vs remote memory, first-touch allocation and why Go is not NUMA-aware, then describe mitigations (one process per node, numactl, k8s topology manager). For prefetching, the key line is: prefetchers love sequential/strided access and cannot help with pointer chasing.',
          examples: [
            {
              label: 'Inspect NUMA topology and remote allocations',
              lang: 'bash',
              code: `$ numactl --hardware
available: 2 nodes (0-1)
node 0 cpus: 0-31 64-95
node 0 size: 257586 MB
node 0 free: 120034 MB
node 1 cpus: 32-63 96-127
node 1 size: 258041 MB
node 1 free: 98211 MB
node distances:
node   0   1
  0:  10  21
  1:  21  10          # remote access ~2.1x the "distance" of local

$ numastat -p $(pgrep cache-svc)
Per-node process memory usage (in MBs) for PID 4121 (cache-svc)
                  Node 0     Node 1      Total
Heap            81234.12     312.40   81546.52   # all on node 0: first-touch!

$ numactl --cpunodebind=0 --membind=0 ./cache-svc   # pin CPU + memory to node 0`
            }
          ]
        },
        {
          title: 'Data-Oriented Design: Array-of-Structs vs Struct-of-Arrays',
          def: `<p>How you lay out records decides how many cache lines each loop touches.</p>
<ul><li><strong>Array of Structs (AoS)</strong>: <code>[]Order{ID, UserID, Price, Qty, Status, Note, CreatedAt…}</code>. Great when you use most fields of one record together (handling one request).</li>
<li><strong>Struct of Arrays (SoA)</strong>: <code>Orders{IDs []int64; Prices []float64; Qtys []int32 …}</code>. Great when a loop scans one or two fields over many records (analytics, filtering) — every byte loaded is useful and the loop can be vectorised.</li></ul>
<table><thead><tr><th>Scan "sum Price" over 1M orders</th><th>AoS (80-byte struct)</th><th>SoA</th></tr></thead><tbody>
<tr><td>Bytes pulled into cache</td><td>~80 MB (whole structs)</td><td>8 MB (prices only)</td></tr>
<tr><td>Cache lines touched</td><td>~1.25M</td><td>125K</td></tr>
<tr><td>SIMD-friendly</td><td>No</td><td>Yes</td></tr>
</tbody></table>
<p>Related techniques:</p>
<ul><li><strong>Hot/cold splitting</strong>: keep frequently accessed fields in a compact struct; move rarely used ones (descriptions, metadata maps) behind a pointer.</li>
<li><strong>Field ordering</strong> to remove padding (the <code>fieldalignment</code> analyzer reports this).</li>
<li><strong>Values over pointers</strong>: <code>[]T</code> is one contiguous block; <code>[]*T</code> adds a miss per element and gives the GC millions of pointers to scan. Pointer-free memory (no pointers in T) is skipped entirely by GC marking.</li>
<li><strong>Columnar storage</strong> (Parquet, ClickHouse, Arrow) is SoA on disk for the same reason.</li></ul>
<p>Don't contort a whole codebase: apply SoA to measured hot loops over large collections.</p>`,
          interview: 'Explain AoS vs SoA in terms of cache lines touched per useful byte, relate SoA to columnar databases, and mention hot/cold splitting and values-not-pointers in Go (also helps GC). Make it clear you would apply it only to profiled hot paths.',
          examples: [
            {
              label: 'AoS vs SoA in Go',
              lang: 'go',
              code: `// AoS: natural for per-request handling.
type Order struct {
    ID        int64
    UserID    int64
    Price     float64
    Qty       int32
    Status    uint8
    CreatedAt int64
    Note      string // 16 bytes (pointer + len): cold, rarely read
    Tags      []string
}

func totalAoS(orders []Order) (t float64) {
    for i := range orders { // loads whole 80-byte structs to read 12 bytes each
        t += orders[i].Price * float64(orders[i].Qty)
    }
    return t
}

// SoA: natural for scans/analytics over a few columns.
type Orders struct {
    ID     []int64
    Price  []float64
    Qty    []int32
    Status []uint8
}

func totalSoA(o *Orders) (t float64) {
    for i := range o.Price { // reads 12 useful bytes per order, all sequential
        t += o.Price[i] * float64(o.Qty[i])
    }
    return t
}`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Explain why row-major vs column-major 2D traversal differs in speed',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>How are 2-D arrays laid out in memory in Go/C?</li><li>How many <code>int32</code>s fit in one 64-byte cache line?</li><li>What is the stride between consecutive accesses in each order? Think about the prefetcher, the TLB and set conflicts.</li></ul>`,
          solution: `Layout: row-major, element (r,c) at base + (r*C + c)*4.

Row-major loop (c inner): stride 4 bytes.
- 1 cache miss per 16 elements; the hardware prefetcher detects the stream,
  so most misses are hidden. 1 TLB miss per 4 KiB page (1024 elements).

Column-major loop (r inner): stride C*4 bytes (16 KiB for C = 4096).
- Every access touches a new cache line (only 4 of 64 bytes used) and a new
  page (TLB miss). With a power-of-two stride all lines map to the same
  cache sets -> conflict misses evict lines before the next column reuses them.

Measured in Go (4096x4096 int32): ~12 ms vs ~248 ms (~20x).
Fixes: swap the loops; for algorithms that need both orders (transpose,
matrix multiply) use tiling/blocking so a tile fits in L1/L2.`,
          lang: 'text'
        },
        {
          t: 'Split an address into tag, index and offset',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Cache: 32 KiB, 8-way set associative, 64-byte lines, 48-bit addresses.</li><li>Compute number of sets, then bits for offset and index; the rest is tag.</li><li>Which addresses conflict with <code>0x1000</code>?</li></ul>`,
          solution: `lines = 32768 / 64 = 512
sets  = 512 / 8   = 64
offset bits = log2(64) = 6   -> bits 0..5
index bits  = log2(64) = 6   -> bits 6..11
tag bits    = 48 - 12  = 36  -> bits 12..47

Address 0x1000: offset 0, index 0, tag 0x1.
Every address that is a multiple of 4096 (0x0000, 0x1000, 0x2000, ...)
maps to set 0. Only 8 of them can be cached at once; touching a 9th in a
loop evicts one -> conflict misses even though the cache is mostly empty.`,
          lang: 'text'
        },
        {
          t: 'Calculate average memory access time (AMAT)',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>AMAT = hit time + miss rate × miss penalty, applied recursively per level.</li><li>Given: L1 1 ns, 5% miss; L2 4 ns, 20% local miss; DRAM 100 ns.</li><li>Then: what if a data-layout fix cuts the L1 miss rate to 2%?</li></ul>`,
          solution: `L2 effective penalty = 4 + 0.20 * 100 = 24 ns
AMAT = 1 + 0.05 * 24 = 2.2 ns

With L1 miss rate 2%: AMAT = 1 + 0.02 * 24 = 1.48 ns  (~33% faster memory ops)
With DRAM latency 200 ns (remote NUMA): L2 penalty = 4 + 0.2*200 = 44
  AMAT = 1 + 0.05*44 = 3.2 ns

Takeaway: small changes in miss rate matter more than raw clock speed,
because the DRAM penalty is ~100x the hit time.`,
          lang: 'text'
        },
        {
          t: 'Demonstrate and fix false sharing in Go',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Have N goroutines each increment their own counter in a <code>[]int64</code> or adjacent struct fields.</li><li>Benchmark, then pad each counter to its own cache line (64 or 128 bytes).</li><li>Alternatively accumulate in a local variable and write once at the end.</li><li>Verify with <code>go test -bench</code> and (Linux) <code>perf c2c record</code>.</li></ul>`,
          solution: `package fs

import (
    "runtime"
    "sync"
    "sync/atomic"
    "testing"
)

const perWorker = 5_000_000

// BAD: 8 int64 counters share one cache line.
func countShared(workers int) {
    counts := make([]atomic.Int64, workers)
    var wg sync.WaitGroup
    for w := 0; w < workers; w++ {
        wg.Add(1)
        go func(w int) {
            defer wg.Done()
            for i := 0; i < perWorker; i++ {
                counts[w].Add(1)
            }
        }(w)
    }
    wg.Wait()
}

// FIX 1: pad each counter to 128 bytes (covers adjacent-line prefetch).
type padded struct {
    n atomic.Int64
    _ [120]byte
}

func countPadded(workers int) {
    counts := make([]padded, workers)
    var wg sync.WaitGroup
    for w := 0; w < workers; w++ {
        wg.Add(1)
        go func(w int) {
            defer wg.Done()
            for i := 0; i < perWorker; i++ {
                counts[w].n.Add(1)
            }
        }(w)
    }
    wg.Wait()
}

// FIX 2 (best): no sharing at all -- local accumulation, one write at the end.
func countLocal(workers int) []int64 {
    out := make([]int64, workers)
    var wg sync.WaitGroup
    for w := 0; w < workers; w++ {
        wg.Add(1)
        go func(w int) {
            defer wg.Done()
            local := int64(0)
            for i := 0; i < perWorker; i++ {
                local++
            }
            out[w] = local
        }(w)
    }
    wg.Wait()
    return out
}

func BenchmarkShared(b *testing.B) {
    for i := 0; i < b.N; i++ {
        countShared(runtime.GOMAXPROCS(0))
    }
}
func BenchmarkPadded(b *testing.B) {
    for i := 0; i < b.N; i++ {
        countPadded(runtime.GOMAXPROCS(0))
    }
}

// Expect Padded to be several times faster and to scale with cores, while
// Shared gets SLOWER as workers increase (the line ping-pongs among all cores).`,
          lang: 'go'
        },
        {
          t: 'Classify cache misses and fix a power-of-two stride problem',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>Scenario: a 1024×1024 <code>float64</code> matrix (8 KiB rows) is transposed; performance collapses compared to 1000×1000.</li><li>Which of the 3 Cs dominates? Why does size 1024 hurt more than 1000?</li><li>Two fixes: padding the row length and tiling.</li></ul>`,
          solution: `Column accesses stride by 8 KiB. With 64 sets x 64 B, addresses 4 KiB apart
map to the same set, so every element of a column hits the SAME L1 set
(and few L2 sets). Only 8-12 ways exist -> CONFLICT misses: lines are
evicted before neighbouring columns reuse them, despite free capacity.

With 1000 columns (8000-byte rows) the stride is not a power of two, so
successive rows spread across different sets.

Fixes:
1. Pad rows: allocate cols+8 (row stride 8256 bytes) and index r*stride+c.
2. Tile: transpose 32x32 blocks so each block's lines stay in L1:
   for bi := 0; bi < n; bi += 32 {
       for bj := 0; bj < n; bj += 32 {
           for i := bi; i < min(bi+32, n); i++ {
               for j := bj; j < min(bj+32, n); j++ {
                   dst[j*n+i] = src[i*n+j]
               }
           }
       }
   }
Compulsory misses remain (each line must be loaded once); capacity misses
are reduced by tiling; conflict misses by padding.`,
          lang: 'text'
        },
        {
          t: 'Shrink a hot struct with field ordering and hot/cold splitting',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Compute each field's offset including padding; check with <code>unsafe.Sizeof</code>.</li><li>Order fields from largest alignment to smallest.</li><li>Move rarely accessed fields behind a pointer so the hot part fits in fewer cache lines.</li><li>Tool: <code>fieldalignment</code> from golang.org/x/tools.</li></ul>`,
          solution: `// Before: 40 bytes
type Session struct {
    Active  bool  // 0  (+7 pad)
    ID      int64 // 8
    Retries uint8 // 16 (+7 pad)
    Expires int64 // 24
    Admin   bool  // 32 (+3 pad)
    UserID  int32 // 36
}

// After: 24 bytes (40% smaller, 2.6 sessions per cache line instead of 1.6)
type SessionHot struct {
    ID      int64 // 0
    Expires int64 // 8
    UserID  int32 // 16
    Active  bool  // 20
    Retries uint8 // 21
    Admin   bool  // 22 (+1 pad)
    // Cold, rarely used fields live elsewhere:
    // Meta *SessionMeta  (adds 8 bytes; only if needed)
}

type SessionMeta struct {
    UserAgent string
    IP        string
    Claims    map[string]string
}

// Check: fmt.Println(unsafe.Sizeof(Session{}), unsafe.Sizeof(SessionHot{})) // 40 24
// Lint:  go run golang.org/x/tools/go/analysis/passes/fieldalignment/cmd/fieldalignment@latest ./...
// For 10M sessions: 400 MB -> 240 MB, fewer cache/TLB misses on expiry scans.`,
          lang: 'go'
        },
        {
          t: 'Convert an array-of-structs hot loop to struct-of-arrays',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>A metrics service keeps <code>[]Sample{TS int64; Value float64; Labels map[string]string; Host string}</code> and computes avg Value over a time range.</li><li>Which bytes does the loop actually need?</li><li>Store timestamps and values in parallel slices; binary search the time range.</li></ul>`,
          solution: `// Before: each Sample is 8+8+8+16 = 40 bytes; the scan reads 16 useful bytes.
type Sample struct {
    TS     int64
    Value  float64
    Labels map[string]string
    Host   string
}

// After: columnar series (SoA). Labels/Host are per-series, not per-sample.
type Series struct {
    Labels map[string]string
    Host   string
    TS     []int64   // sorted
    Values []float64 // Values[i] belongs to TS[i]
}

func (s *Series) Avg(from, to int64) (float64, bool) {
    lo, _ := slices.BinarySearch(s.TS, from)
    hi, _ := slices.BinarySearch(s.TS, to) // half-open [from, to)
    if lo >= hi {
        return 0, false
    }
    sum := 0.0
    for _, v := range s.Values[lo:hi] { // contiguous, prefetch-friendly
        sum += v
    }
    return sum / float64(hi-lo), true
}

// Wins: ~2.5x fewer bytes scanned, sequential access, no per-sample pointers
// for the GC to scan (Values and TS are pointer-free), and the timestamp
// column compresses well (delta encoding) -- the design of Prometheus/
// Gorilla-style TSDBs.`,
          lang: 'go'
        },
        {
          t: 'Measure cache sizes with a pointer-chasing benchmark',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul><li>Build a random cyclic permutation over N slots so each load depends on the previous one (defeats prefetching and OoO overlap).</li><li>Measure ns per hop for working sets from 8 KiB to 1 GiB.</li><li>Plot: latency steps up at each cache size (L1, L2, L3) and again when the TLB reach is exceeded.</li></ul>`,
          solution: `package main

import (
    "fmt"
    "math/rand"
    "time"
)

var sink int

func hopLatency(bytes int) time.Duration {
    n := bytes / 8
    perm := rand.Perm(n)
    next := make([]int, n)
    for i := 0; i < n; i++ { // one big random cycle
        next[perm[i]] = perm[(i+1)%n]
    }
    const hops = 20_000_000
    p := perm[0]
    start := time.Now()
    for i := 0; i < hops; i++ {
        p = next[p] // dependent load: address comes from previous load
    }
    sink = p
    return time.Since(start) / hops
}

func main() {
    for kb := 8; kb <= 1<<20; kb *= 2 {
        fmt.Printf("%8d KiB  %6.1f ns/hop\\n", kb, float64(hopLatency(kb*1024)))
    }
}

// Illustrative output (48K L1, 2M L2, 30M L3):
//       16 KiB     1.1 ns/hop   <- L1
//      256 KiB     3.6 ns/hop   <- L2
//     8192 KiB    14.2 ns/hop   <- L3
//    65536 KiB    92.5 ns/hop   <- DRAM
//  1048576 KiB   118.3 ns/hop   <- DRAM + TLB misses (page walks)
// Run on an idle machine; repeat with huge pages to see the TLB step shrink.`,
          lang: 'go'
        },
        {
          t: 'Diagnose inconsistent latency in a large in-memory cache on a 2-socket host',
          d: 'hard',
          type: 'debug',
          hint: `<ul><li>Symptom: p50 is fine, but latency is bimodal and depends on which CPU handled the request.</li><li>Check NUMA topology and where the heap pages live (<code>numastat -p</code>).</li><li>Remember first-touch allocation and that Go migrates goroutines across all CPUs.</li></ul>`,
          solution: `Investigation
1. lscpu / numactl --hardware -> 2 NUMA nodes, distance 10 vs 21.
2. numastat -p <pid> -> 95% of heap on node 0 (the cache was warmed at startup
   by one goroutine running on node 0: first-touch policy).
3. perf stat -e node-loads,node-load-misses (or uncore events) -> high remote
   access ratio; requests served by goroutines on node-1 CPUs pay ~1.7x latency
   and contend on the interconnect.

Options
- Run two instances, each pinned to one node:
    numactl --cpunodebind=0 --membind=0 ./cache -port 8080
    numactl --cpunodebind=1 --membind=1 ./cache -port 8081
  and shard keys between them (consistent hashing).
- If one process must span nodes: numactl --interleave=all to spread pages
  evenly (uniform ~1.5x average instead of bimodal), or warm the cache in
  parallel from goroutines spread across nodes.
- Kubernetes: static CPU manager + Topology Manager policy single-numa-node
  for Guaranteed pods, sized to fit within one node.
- Or simply use smaller instances that are single-NUMA.`,
          lang: 'text'
        },
        {
          t: 'Design a high-throughput sharded counter without contention',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>A single <code>atomic.Int64</code> incremented by 64 cores becomes one cache line bouncing between all cores.</li><li>Shard into per-CPU-ish slots, each padded to its own cache line; sum on read.</li><li>Go has no public "current CPU" API — how will you pick a shard cheaply?</li><li>Trade-off: reads become O(shards) and are not a linearizable snapshot.</li></ul>`,
          solution: `package counter

import (
    "math/rand/v2"
    "runtime"
    "sync/atomic"
)

type slot struct {
    n atomic.Int64
    _ [120]byte // 128-byte slots: no false sharing, even with adjacent-line prefetch
}

type Sharded struct {
    slots []slot
    mask  uint32
}

func New() *Sharded {
    n := 1
    for n < runtime.GOMAXPROCS(0) {
        n <<= 1
    }
    return &Sharded{slots: make([]slot, n), mask: uint32(n - 1)}
}

// Add picks a random slot: math/rand/v2's global source is per-thread and
// lock-free, so this costs a few ns and spreads writers across lines.
func (c *Sharded) Add(d int64) {
    c.slots[rand.Uint32()&c.mask].n.Add(d)
}

// Load sums all slots. Not an atomic snapshot -- fine for metrics/rate limits.
func (c *Sharded) Load() int64 {
    var t int64
    for i := range c.slots {
        t += c.slots[i].n.Load()
    }
    return t
}

// Alternatives: callers that own a worker index use slots[workerID];
// batch locally and flush every N ops; or for read-mostly config use
// atomic.Pointer to an immutable snapshot. This is the same idea as
// Java's LongAdder and the Linux kernel's per-CPU counters.`,
          lang: 'go'
        }
      ],
      interviewFocus: [
        {
          q: 'What is false sharing, and how do you detect and fix it in Go?',
          a: `<p>CPU caches keep coherence per <strong>cache line</strong> (64 bytes). When two cores write <em>different</em> variables that live on the <em>same</em> line, each write needs exclusive ownership (MESI M/E state), invalidating the other core's copy. The line ping-pongs between cores even though no data is logically shared — that is <strong>false sharing</strong>.</p>
<p><strong>Symptoms</strong>: a parallel loop that gets <em>slower</em> as you add goroutines; high CPU with low IPC; per-worker stats/counters in a slice or adjacent struct fields.</p>
<p><strong>Detection</strong>: benchmarks at different <code>-cpu</code> values (<code>go test -bench . -cpu 1,2,4,8</code>), <code>perf c2c</code> (shows contended lines and the offsets being written), and code review of hot shared structs.</p>
<p><strong>Fixes</strong>:</p>
<ul><li>Pad per-core data to its own line: <code>struct{ n atomic.Int64; _ [56]byte }</code>, or 128 bytes on Intel (adjacent-line prefetcher), or <code>cpu.CacheLinePad</code>.</li>
<li>Avoid sharing: accumulate in goroutine-local variables and merge once.</li>
<li>Separate read-mostly fields from frequently written ones (e.g. ring buffer head and tail on different lines).</li></ul>
<p>Contrast with <strong>true sharing</strong> (everyone updates the same counter): padding doesn't help; you need sharding or batching.</p>`
        },
        {
          q: 'Walk me through the memory hierarchy and the latency numbers every engineer should know.',
          a: `<p>Registers (0 cycles) → L1 ~1 ns (32–48 KiB) → L2 ~4 ns (1–2 MiB) → L3 ~15 ns (tens of MiB, shared) → DRAM ~100 ns (remote NUMA ~150+ ns) → NVMe ~20–100 µs → same-datacenter RTT ~0.5 ms → HDD seek ~10 ms → cross-region RTT ~50–150 ms.</p>
<p>Why it matters:</p>
<ul><li>One DRAM miss ≈ 300 cycles ≈ time to execute hundreds of instructions; memory-bound code has low IPC.</li>
<li>Caches move 64-byte lines, so <strong>locality</strong> decides performance: sequential access is bandwidth-bound and prefetched; random access is latency-bound.</li>
<li>Back-of-envelope: scanning 1 GB sequentially at ~10 GB/s ≈ 100 ms; 10M random lookups in a big map ≈ 10M × ~100 ns ≈ 1 s on one core.</li></ul>
<p>The same ladder guides architecture: in-process cache vs Redis vs DB, and why batching network calls matters (RTT dwarfs local work).</p>`
        },
        {
          q: 'How does cache coherence (MESI) work, and what does it cost your concurrent code?',
          a: `<p>Each line in a private cache is in state <strong>M</strong>odified, <strong>E</strong>xclusive, <strong>S</strong>hared or <strong>I</strong>nvalid. Reads can share a line (S) across cores. A write requires M/E: the core issues a read-for-ownership/invalidate, other copies go to I, and later readers must fetch the up-to-date line (from the owner's cache or memory).</p>
<p>Costs:</p>
<ul><li><strong>Contended writes</strong> (a shared atomic counter, a hot mutex) serialise through the line transfer: ~20–100 ns per handoff, worse across sockets. An uncontended atomic add is a few ns; a contended one can be 10–50× slower.</li>
<li><strong>Read-mostly data</strong> is cheap: lines stay Shared in every core.</li>
<li><strong>False sharing</strong> creates the same traffic without logical sharing.</li></ul>
<p>Design rules: prefer read-mostly shared state (immutable snapshots via <code>atomic.Pointer</code>), shard writes (per-core counters), batch updates, and keep writer-owned fields on separate lines. Coherence is also why <code>sync.RWMutex</code> can scale poorly — readers still write the reader count on a shared line.</p>`
        },
        {
          q: 'Why is a slice of structs usually faster than a slice of pointers or a linked structure? When is SoA better than AoS?',
          a: `<p><code>[]T</code> stores values contiguously: sequential iteration uses every byte of each cache line, the prefetcher streams ahead, and loads are independent so many misses overlap. <code>[]*T</code> stores pointers; each dereference goes to a scattered heap object — an extra potential cache and TLB miss per element, plus pointer chasing defeats prefetching. The GC must also trace every pointer, adding CPU and latency.</p>
<p><strong>AoS vs SoA</strong>:</p>
<ul><li>AoS (<code>[]Order</code>) wins when you use most fields of a record together (request handling).</li>
<li>SoA (<code>Prices []float64; Qtys []int32</code>) wins when hot loops scan a few fields across many records: fewer bytes loaded, SIMD-friendly, compresses well — exactly why analytics databases are columnar.</li></ul>
<p>Caveats: values are copied on range (use index <code>&amp;s[i]</code> for big structs), pointer-free large slices are skipped by GC marking, and a <code>[]T</code> that grows re-allocates, invalidating pointers into it.</p>`
        },
        {
          q: 'What is NUMA and when should a Go backend engineer care?',
          a: `<p>On multi-socket (and some chiplet) servers, memory is attached to specific nodes. Local access ~80–100 ns; remote access through the interconnect ~1.3–2× slower with less bandwidth. Linux places pages on the node that first touches them.</p>
<p>Go's scheduler is NUMA-oblivious: goroutines and their data move freely, so a large heap built by one goroutine ends up on one node and half the cores access it remotely.</p>
<p>Care when: very large in-memory datasets (caches, indexes), memory-bandwidth-heavy services, or tail-latency-critical workloads on large bare-metal/cloud instances. Mitigations: one process per NUMA node (<code>numactl --cpunodebind/--membind</code>) with key sharding, <code>--interleave=all</code> for uniform performance, Kubernetes Topology Manager <code>single-numa-node</code>, or choosing instance sizes that fit one node. Verify with <code>numastat</code> and latency histograms per CPU.</p>`
        }
      ],
      quiz: [
        { q: 'What is the cache line size on x86-64?', a: '64 bytes (Apple M-series uses 128-byte lines).' },
        { q: 'Roughly how long is a DRAM access compared with an L1 hit?', a: 'About 100 ns vs about 1 ns: roughly 100x slower (hundreds of cycles).' },
        { q: 'Name the 3 Cs of cache misses.', a: 'Compulsory (cold), capacity and conflict (coherence misses are often added as a fourth).' },
        { q: 'What does the E state in MESI mean?', a: 'Exclusive: the only cached copy, clean; the core can write it without bus traffic (it becomes Modified).' },
        { q: 'What is false sharing?', a: 'Cores writing different variables that share a cache line, causing the line to bounce between caches as if the data were shared.' },
        { q: 'Why is iterating a [][]int column by column slow?', a: 'Each access jumps a whole row, touching a new cache line (and often page) every time, defeating spatial locality and prefetching.' },
        { q: 'What is the first-touch NUMA policy?', a: 'Linux allocates a physical page on the NUMA node of the CPU that first writes it.' },
        { q: 'When is struct-of-arrays better than array-of-structs?', a: 'When hot loops read only a few fields across many records: fewer bytes per cache line are wasted and the loop can vectorise.' }
      ],
      resources: [
        { title: 'Ulrich Drepper — What Every Programmer Should Know About Memory', url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf', type: 'article' },
        { title: 'OSTEP — Multiprocessor Scheduling (caches, coherence, affinity)', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-multi.pdf', type: 'book' },
        { title: 'Linux man page — numa(7)', url: 'https://man7.org/linux/man-pages/man7/numa.7.html', type: 'docs' },
        { title: 'Go GC Guide (pointers, heap layout and GC cost)', url: 'https://go.dev/doc/gc-guide', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 4 ─────────────────────────────
    {
      n: 4,
      title: 'Virtual Memory',
      summary: 'How the OS gives every process its own address space: paging, multi-level page tables, TLBs, page faults, copy-on-write, mmap, huge pages, overcommit and the OOM killer — and how this explains RSS, container OOMKills and GOMEMLIMIT.',
      topics: [
        {
          title: 'Address Spaces & Paging',
          def: `<p>Every process sees its own private <strong>virtual address space</strong>. The <strong>MMU</strong> (memory management unit) translates each virtual address to a physical address using <strong>page tables</strong> managed by the kernel. This provides:</p>
<ul><li><strong>Isolation</strong>: one process cannot read or corrupt another's memory.</li>
<li><strong>Simplicity</strong>: every program can assume the same layout regardless of physical RAM.</li>
<li><strong>Efficiency</strong>: memory is allocated lazily, shared (libraries, page cache) and swapped transparently.</li></ul>
<p>Memory is managed in fixed-size <strong>pages</strong> — usually <strong>4 KiB</strong> (huge pages: 2 MiB, 1 GiB; some ARM64 kernels use 16 or 64 KiB). A virtual address is split into a <em>virtual page number</em> and an <em>offset</em>; translation replaces the page number with a <em>physical frame number</em> and keeps the offset.</p>
<table><thead><tr><th>Region (low → high)</th><th>Contents</th></tr></thead><tbody>
<tr><td>Text</td><td>Machine code, read-only + executable</td></tr>
<tr><td>Data / BSS</td><td>Initialised / zeroed globals</td></tr>
<tr><td>Heap</td><td>Dynamic allocations (Go reserves heap arenas with <code>mmap</code>)</td></tr>
<tr><td>mmap region</td><td>Shared libraries, mapped files, anonymous mappings</td></tr>
<tr><td>Stack</td><td>Main thread stack (grows down); each OS thread has its own</td></tr>
<tr><td>Kernel</td><td>Upper half, inaccessible from user mode</td></tr>
</tbody></table>
<p>Each page-table entry also carries <strong>permission bits</strong> (present, writable, user/supervisor, no-execute) plus <em>accessed</em> and <em>dirty</em> bits the kernel uses for reclaim. Violations trigger a fault — that is how <code>SIGSEGV</code> works, and how Go turns a nil-pointer dereference into a <code>panic</code> (the runtime's signal handler sees a fault near address 0).</p>
<p><strong>Go note:</strong> goroutine stacks are not OS stacks; they start at a few KiB, live in the Go heap and grow by copying. Only OS threads (Ms) get kernel-visible stacks.</p>`,
          interview: 'Explain why virtual memory exists (isolation, lazy allocation, sharing, simple layout), that the MMU translates per page with permission bits, and sketch a process layout. Linking SIGSEGV to page permissions and Go nil-pointer panics shows real understanding.',
          examples: [
            {
              label: 'Inspect a Go process address space',
              lang: 'bash',
              code: `$ cat /proc/$(pgrep api)/maps | head -12
00400000-0074a000 r-xp 00000000 08:01 1835023     /usr/local/bin/api     # text
0074a000-00b4c000 r--p 0034a000 08:01 1835023     /usr/local/bin/api     # rodata
00b4c000-00b8d000 rw-p 0074c000 08:01 1835023     /usr/local/bin/api     # data
00b8d000-00bcb000 rw-p 00000000 00:00 0                                  # bss
c000000000-c004000000 rw-p 00000000 00:00 0                              # Go heap arena
7f1c4c000000-7f1c4c021000 rw-p 00000000 00:00 0                          # anon mmap
7ffd8a3f1000-7ffd8a412000 rw-p 00000000 00:00 0   [stack]               # main thread stack
7ffd8a5e5000-7ffd8a5e9000 r--p 00000000 00:00 0   [vvar]
7ffd8a5e9000-7ffd8a5eb000 r-xp 00000000 00:00 0   [vdso]                # fast syscalls (clock_gettime)

$ getconf PAGESIZE
4096`
            }
          ]
        },
        {
          title: 'Multi-Level Page Tables & the TLB',
          def: `<p>A flat page table for a 48-bit address space with 4 KiB pages would need 2<sup>36</sup> entries × 8 B = <strong>512 GiB per process</strong>. Instead, x86-64 uses a <strong>4-level radix tree</strong> (PML4 → PDPT → PD → PT; 5 levels with 57-bit addresses on newer CPUs). Each level is indexed by 9 bits, and each table is one 4 KiB page of 512 entries. Only populated subtrees are allocated, so sparse address spaces are cheap.</p>
<p><code>| 9 bits PML4 | 9 bits PDPT | 9 bits PD | 9 bits PT | 12 bits offset |</code></p>
<p>The cost: a translation needs up to 4 dependent memory reads (a <strong>page walk</strong>). The <strong>TLB</strong> (translation lookaside buffer) caches recent translations:</p>
<table><thead><tr><th>Structure</th><th>Typical entries</th><th>Reach</th></tr></thead><tbody>
<tr><td>L1 dTLB, 4 KiB pages</td><td>64–96</td><td>~256–384 KiB</td></tr>
<tr><td>L1 dTLB, 2 MiB pages (Intel: separate small array)</td><td>~32</td><td>~64 MiB</td></tr>
<tr><td>L1 dTLB, 2 MiB pages (AMD Zen 4/5: one shared array for all sizes)</td><td>72–96</td><td>up to ~144–192 MiB</td></tr>
<tr><td>L2 STLB (shared by 4 KiB and 2 MiB pages)</td><td>1.5K–4K</td><td>~6–16 MiB (4 KiB) / ~3–8 GiB (2 MiB)</td></tr>
</tbody></table>
<p>Exact sizes vary by core (e.g. Skylake: 64 × 4K + 32 × 2M L1 entries, 1,536-entry STLB; Golden Cove: 96 + 32, 2,048-entry STLB; Zen 4: 72-entry L1, 3,072-entry L2), and 1 GiB pages get their own handful of entries. The rule of thumb that survives interviews: <em>with 4 KiB pages the whole TLB hierarchy covers only megabytes; with 2 MiB pages it covers gigabytes</em> — mostly thanks to the large shared STLB, not the small L1.</p>
<p>A TLB hit adds ~0–1 cycle; a miss triggers a hardware page walk (tens of cycles if the page-table entries are cached, hundreds if not). Workloads with large random-access working sets (big hash maps, in-memory DBs, JVM/Go heaps of many GiB) can spend 10–30% of cycles on page walks.</p>
<p><strong>Effective access time</strong>: <code>EAT = h × (t<sub>TLB</sub> + m) + (1 − h) × (t<sub>TLB</sub> + k·m + m)</code>, where <em>k</em> is the number of page-table memory accesses on a miss.</p>
<p><strong>Context switches</strong>: switching to another process changes the page-table root (CR3); without <strong>PCID</strong>/ASID tags the TLB must be flushed. Threads of the same process share page tables, so switching between them keeps the TLB warm — and goroutine switches never touch it at all.</p>`,
          interview: 'Know why page tables are multi-level (sparse address spaces), how a 48-bit address splits 9/9/9/9/12, what the TLB caches and its reach, and be ready to compute effective access time. Linking TLB flushes to process vs thread vs goroutine switch cost is a frequent follow-up.',
          examples: [
            {
              label: 'Measure TLB misses and page walks with perf',
              lang: 'bash',
              code: `$ perf stat -e dTLB-loads,dTLB-load-misses,page-faults ./lookup-bench
 Performance counter stats for './lookup-bench':
     5,231,778,402      dTLB-loads
       412,906,113      dTLB-load-misses   #  7.89% of all dTLB cache accesses
           524,410      page-faults

# Same benchmark with the heap on 2 MiB transparent huge pages:
       21,557,046      dTLB-load-misses   #  0.41% of all dTLB cache accesses
# ~20x fewer TLB misses -> ~15% lower run time for this random-access workload.`
            }
          ]
        },
        {
          title: 'Page Faults, Demand Paging, Swapping & Thrashing',
          def: `<p>With <strong>demand paging</strong>, <code>mmap</code>/<code>malloc</code>/Go heap growth only reserve virtual address space; physical frames are assigned on <strong>first touch</strong>. Accessing a page whose PTE is not present (or lacks permission) raises a <strong>page fault</strong> exception and the kernel decides what to do:</p>
<table><thead><tr><th>Fault type</th><th>Cause</th><th>Cost</th></tr></thead><tbody>
<tr><td><strong>Minor</strong> (soft)</td><td>First touch of anonymous memory (zero-fill), page already in page cache, COW copy</td><td>~0.1–1 µs (plus zeroing/copying 4 KiB)</td></tr>
<tr><td><strong>Major</strong> (hard)</td><td>Data must be read from disk: mapped file not cached, page swapped out</td><td>~10–100 µs (NVMe) to ~10 ms (HDD)</td></tr>
<tr><td><strong>Invalid</strong></td><td>Unmapped address or permission violation</td><td>Kernel sends <code>SIGSEGV</code>/<code>SIGBUS</code></td></tr>
</tbody></table>
<p>When RAM runs low, the kernel <strong>reclaims</strong> pages: clean page-cache pages are dropped, dirty ones written back, and anonymous pages are written to <strong>swap</strong> (if configured). Pages are chosen by approximate LRU (active/inactive lists; MGLRU in newer kernels). <code>vm.swappiness</code> biases between reclaiming file pages and swapping anonymous pages.</p>
<p><strong>Thrashing</strong>: when the combined working sets exceed RAM, processes continually fault pages back in that were just evicted. The system spends its time on I/O, CPU utilisation drops, and latency explodes. Symptoms: high <code>si</code>/<code>so</code> in <code>vmstat</code>, high major-fault rates, elevated <code>wa</code> (I/O wait), and memory PSI (<code>/proc/pressure/memory</code>) rising.</p>
<p><strong>Backend relevance</strong>: Kubernetes nodes traditionally run without swap; node swap is now supported on cgroup v2 nodes with the <code>LimitedSwap</code> behaviour (beta since 1.28, stable in 1.34), where only Burstable pods may swap, in proportion to their memory request, and Guaranteed and high-priority pods never do; a Go service touching a big heap for the first time pays minor faults (latency at startup — consider warming); GC-heavy services suffer badly if any of the heap is swapped because the GC must touch every live object.</p>`,
          interview: 'Distinguish minor vs major vs invalid faults with real costs, explain demand paging (allocation happens on first touch), and describe thrashing with the metrics you would check (vmstat si/so, majflt, PSI). Mention why swap is especially bad for garbage-collected heaps.',
          examples: [
            {
              label: 'Count page faults and spot thrashing',
              lang: 'bash',
              code: `$ /usr/bin/time -v ./etl-job 2>&1 | egrep 'Maximum resident|page faults'
        Maximum resident set size (kbytes): 4194620
        Major (requiring I/O) page faults: 12
        Minor (reclaiming a frame) page faults: 1048911   # ~4 GiB / 4 KiB first touches

$ ps -o pid,min_flt,maj_flt,rss,comm -p $(pgrep api)
    PID  MINFL  MAJFL   RSS COMMAND
   4121 913442  88123 7812344 api                         # many major faults: bad

$ vmstat 1 5
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 2 14 3912044  61232   1024 210400 9312 11840 10240 12604 9822 15011  6 11 14 69  0
# b=14 blocked, si/so = swap in/out KB/s, wa=69% -> thrashing`
            }
          ]
        },
        {
          title: 'Copy-on-Write, fork() & mmap',
          def: `<p><strong>fork()</strong> creates a child with a copy of the parent's address space. Copying gigabytes would be slow, so the kernel uses <strong>copy-on-write (COW)</strong>: parent and child share the same physical pages, marked read-only. The first write by either side causes a (minor) page fault, and the kernel copies just that page. <code>fork()</code> still copies the page tables, which is noticeable for very large processes.</p>
<ul><li><strong>Redis BGSAVE</strong> forks to snapshot memory; under heavy writes, many pages are copied, so memory can approach 2× — and transparent huge pages make each COW copy 2 MiB instead of 4 KiB.</li>
<li><strong>fork + exec</strong>: the child usually replaces its image immediately. Go's <code>os/exec</code> on Linux uses <code>clone(CLONE_VM|CLONE_VFORK)</code> so the parent's page tables are not copied at all.</li>
<li>Go programs cannot safely <code>fork()</code> without <code>exec</code> — only the forking thread survives in the child, leaving the runtime's other threads (scheduler, GC) missing.</li></ul>
<p><strong>mmap()</strong> maps a file or anonymous memory into the address space:</p>
<table><thead><tr><th>Flags</th><th>Behaviour</th><th>Used for</th></tr></thead><tbody>
<tr><td>File + <code>MAP_SHARED</code></td><td>Pages are the page cache; writes reach the file (on writeback/<code>msync</code>)</td><td>Databases (LMDB, bbolt), shared data between processes</td></tr>
<tr><td>File + <code>MAP_PRIVATE</code></td><td>COW private copy; writes not visible to the file</td><td>Loading executables and shared libraries</td></tr>
<tr><td>Anonymous</td><td>Zero-filled memory</td><td>Allocators (Go heap arenas, large malloc)</td></tr>
</tbody></table>
<p>Benefits of file mmap: no copy from page cache into a user buffer, the OS caches and evicts for you, many processes share one copy. Costs: page faults instead of explicit I/O (latency hidden from your code, can't be cancelled), <code>SIGBUS</code> if the file is truncated, TLB pressure, and harder error handling. Data in mmapped regions is invisible to Go's GC, which is why some Go caches/indices use it.</p>`,
          interview: 'Explain COW and why fork() is fast but not free (page tables, COW faults under writes — the Redis BGSAVE memory spike). For mmap, know shared vs private vs anonymous mappings and the trade-offs vs read(): zero-copy and OS-managed caching versus page-fault latency, SIGBUS and lack of control.',
          examples: [
            {
              label: 'Memory-map a file read-only in Go (Linux/macOS)',
              lang: 'go',
              code: `package main

import (
    "bytes"
    "fmt"
    "os"
    "syscall"
)

func main() {
    f, err := os.Open("/var/data/index.bin")
    if err != nil {
        panic(err)
    }
    defer f.Close()

    st, err := f.Stat()
    if err != nil {
        panic(err)
    }
    data, err := syscall.Mmap(int(f.Fd()), 0, int(st.Size()),
        syscall.PROT_READ, syscall.MAP_SHARED)
    if err != nil {
        panic(err)
    }
    defer syscall.Munmap(data)

    // data is a []byte backed by the page cache: no read() copy, pages are
    // faulted in lazily on first access, and the GC does not scan it.
    fmt.Println(bytes.Count(data, []byte("\\n")), "lines")
}

// golang.org/x/sys/unix.Mmap + unix.Madvise(data, unix.MADV_SEQUENTIAL)
// let you hint access patterns; x/exp/mmap offers a portable read-only API.`
            }
          ]
        },
        {
          title: 'Huge Pages',
          def: `<p><strong>Huge pages</strong> map 2 MiB (or 1 GiB) with a single TLB entry instead of 512 (or 262,144) 4 KiB entries. Benefits: dramatically larger TLB reach, shorter page walks (one fewer level), fewer page-table pages. Costs: internal fragmentation, more expensive faults and COW copies, and the kernel needs physically contiguous memory.</p>
<table><thead><tr><th>Mechanism</th><th>How</th><th>Notes</th></tr></thead><tbody>
<tr><td><strong>HugeTLB</strong> (static)</td><td>Pre-reserve with <code>vm.nr_hugepages</code>; use via <code>hugetlbfs</code> or <code>MAP_HUGETLB</code></td><td>Predictable; used by DPDK, Oracle, some JVM setups; Kubernetes supports <code>hugepages-2Mi</code> resources</td></tr>
<tr><td><strong>Transparent Huge Pages</strong> (THP)</td><td>Kernel automatically uses 2 MiB pages for eligible anonymous memory; <code>khugepaged</code> collapses small pages in the background</td><td>Modes: <code>always</code>, <code>madvise</code>, <code>never</code></td></tr>
</tbody></table>
<p>THP trade-offs: with <code>always</code>, page faults may trigger synchronous <strong>compaction</strong> (latency spikes), memory can bloat when sparse 2 MiB regions are fully backed, and fork/COW copies 2 MiB at a time. That's why Redis, MongoDB and many latency-sensitive databases recommend <code>madvise</code> or <code>never</code>. Throughput-oriented services with big heaps (JVM, Go, ML) often gain 5–15% from THP.</p>
<p><strong>Go</strong>: the runtime reserves its heap in large aligned 64 MiB arenas, so with THP <code>always</code> it gets huge pages naturally. Go 1.21 briefly added explicit <code>MADV_HUGEPAGE</code>/<code>MADV_COLLAPSE</code> hints, then removed them after reports of RSS bloat and stalls; current releases leave it to the system setting, and <code>GODEBUG=disablethp=1</code> opts the heap out on hosts that run <code>always</code>. Under <code>madvise</code> mode the Go heap therefore gets few or no huge pages.</p>
<p><strong>Newer kernels</strong>: multi-size THP (mTHP, Linux 6.8+) lets anonymous memory use intermediate sizes such as 16–64 KiB "large folios" (configured under <code>/sys/kernel/mm/transparent_hugepage/hugepages-*kB/</code>), getting some of the TLB benefit with less bloat; ARM64 can also map such ranges with a single "contiguous" TLB entry. Treat all of this as a knob to <em>measure</em> (dTLB misses, latency percentiles, RSS) rather than a default to flip.</p>`,
          interview: 'State the benefit (TLB reach) and the costs (compaction stalls, memory bloat, COW amplification), distinguish static HugeTLB from THP, and explain why Redis/MongoDB disable THP while throughput workloads like big JVM/Go heaps often benefit. Always say you would measure.',
          examples: [
            {
              label: 'Check and control transparent huge pages',
              lang: 'bash',
              code: `$ cat /sys/kernel/mm/transparent_hugepage/enabled
always [madvise] never

$ grep -i huge /proc/meminfo
AnonHugePages:   3170304 kB      # THP currently in use
HugePages_Total:       0         # static HugeTLB pool (vm.nr_hugepages)
Hugepagesize:       2048 kB

$ grep AnonHugePages /proc/$(pgrep api)/smaps_rollup
AnonHugePages:   1048576 kB      # 1 GiB of this Go process is on 2 MiB pages

# Change mode at runtime (root):
$ echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled`
            }
          ]
        },
        {
          title: 'Overcommit, the OOM Killer, RSS vs VSZ & cgroup Memory Limits',
          def: `<p>Linux <strong>overcommits</strong> memory: allocations reserve address space and succeed even if RAM + swap couldn't back them all, betting that not every page will be touched. Policy is <code>vm.overcommit_memory</code>: <code>0</code> heuristic (default), <code>1</code> always allow, <code>2</code> strict accounting (CommitLimit = swap + RAM × <code>overcommit_ratio</code>).</p>
<p>When memory truly runs out, the <strong>OOM killer</strong> picks a victim by <code>oom_score</code> (mostly proportional to memory usage) adjusted by <code>oom_score_adj</code> (−1000…1000) and sends <code>SIGKILL</code>. No cleanup, no deferred functions — exit code <strong>137</strong> (128 + 9).</p>
<table><thead><tr><th>Metric</th><th>Meaning</th></tr></thead><tbody>
<tr><td><strong>VSZ</strong> (VSS)</td><td>Total virtual address space reserved — mostly irrelevant for pressure</td></tr>
<tr><td><strong>RSS</strong></td><td>Physical pages currently mapped (includes shared libraries, counted in every process)</td></tr>
<tr><td><strong>PSS</strong></td><td>RSS with shared pages divided among sharers — fair per-process total</td></tr>
<tr><td><strong>USS</strong></td><td>Pages unique to the process — what you'd free by killing it</td></tr>
<tr><td>cgroup <code>memory.current</code></td><td>What the container is charged: anon memory + page cache + kernel memory (sockets, etc.)</td></tr>
</tbody></table>
<p><strong>cgroup v2 limits</strong> (what Kubernetes <code>resources.limits.memory</code> sets): <code>memory.max</code> is the hard limit — the kernel first reclaims the cgroup's page cache, then OOM-kills inside the cgroup ("OOMKilled"). <code>memory.high</code> throttles and reclaims aggressively before that. Page cache is charged but usually reclaimable; tmpfs/<code>emptyDir: Medium: Memory</code> and dirty pages are not freely reclaimable. Other useful files: <code>memory.peak</code> (high-water mark), <code>memory.swap.max</code>, and <code>memory.oom.group</code> — when set to 1 (the kubelet does this for containers on cgroup v2 since Kubernetes 1.28), an OOM kill takes out <em>every</em> process in the container together instead of one victim, so a supervisor or worker pool cannot keep running half-dead.</p>
<p><strong>Go</strong>: by default the heap may grow to ~2× the live heap (GOGC=100) before collecting, so a 600 MiB live heap can exceed a 1 GiB limit. Set <strong><code>GOMEMLIMIT</code></strong> (Go 1.19+) to ~85–90% of the container limit so the GC works harder near the limit. Go's RSS also includes goroutine stacks, runtime metadata, and memory not yet returned by the scavenger.</p>`,
          interview: 'Explain overcommit and why malloc rarely fails on Linux, how the OOM killer chooses (oom_score/oom_score_adj) and that it is SIGKILL (exit 137). Differentiate VSZ/RSS/PSS and cgroup memory.current, and close with how you would keep a Go service under its container limit (GOMEMLIMIT, measuring live heap, avoiding unbounded caches).',
          examples: [
            {
              label: 'RSS vs VSZ and cgroup memory accounting',
              lang: 'bash',
              code: `$ ps -o pid,vsz,rss,comm -p $(pgrep api)
    PID    VSZ   RSS COMMAND
   4121 2491320 612344 api        # VSZ 2.4 GB reserved, RSS 598 MiB resident

# Inside the container (cgroup v2):
$ cat /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.current
1073741824
934281216
$ egrep '^(anon|file|kernel|sock|shmem) ' /sys/fs/cgroup/memory.stat
anon 702545920        # Go heap, stacks, runtime
file 198705152        # page cache (reclaimable)
kernel 21233664
sock 1052672
shmem 0
$ grep oom_kill /sys/fs/cgroup/memory.events
oom_kill 2

$ kubectl get pod api-7d9f -o jsonpath='{.status.containerStatuses[0].lastState.terminated}'
{"exitCode":137,"reason":"OOMKilled",...}

# Fix in the Deployment env:  GOMEMLIMIT=900MiB  (limit 1Gi)`
            }
          ]
        },
        {
          title: 'Memory Allocators: malloc, Slabs & Go\'s Allocator',
          def: `<p>Between your <code>new</code>/<code>make</code>/<code>malloc</code> and the page tables sits a <strong>user-space allocator</strong>. The kernel only hands out whole pages: <code>brk</code>/<code>sbrk</code> grows the classic heap segment and <code>mmap</code> maps anonymous regions anywhere. Allocators request big chunks and then serve small objects from them without a syscall per allocation.</p>
<table><thead><tr><th>Allocator</th><th>Design</th><th>Notes</th></tr></thead><tbody>
<tr><td>glibc malloc (ptmalloc2)</td><td>Per-thread <em>arenas</em> (up to 8 × cores on 64-bit), bins of free chunks, <code>mmap</code> for large requests (default threshold 128 KiB, adaptive)</td><td>Many arenas fragment in long-running multi-threaded servers; <code>MALLOC_ARENA_MAX</code> caps them</td></tr>
<tr><td>jemalloc</td><td>Size classes, thread caches, arenas, time-based purging of dirty pages</td><td>Redis, FreeBSD; good fragmentation behaviour</td></tr>
<tr><td>tcmalloc</td><td>Per-CPU caches (using restartable sequences), central free lists, page heap</td><td>Google's C++ fleet</td></tr>
<tr><td>Kernel buddy + slab (SLUB)</td><td>Buddy allocator hands out 2<sup>n</sup>-page blocks; slab caches carve them into fixed-size objects (<code>task_struct</code>, <code>dentry</code>, <code>inode</code>, socket buffers) with per-CPU free lists</td><td><code>slabtop</code>, <code>/proc/slabinfo</code>; "Slab"/"SUnreclaim" in <code>/proc/meminfo</code></td></tr>
<tr><td>Go runtime</td><td>~68 size classes up to 32 KiB, per-P <code>mcache</code> → <code>mcentral</code> → <code>mheap</code>; larger objects get their own span</td><td>Lock-free fast path; memory managed by the GC</td></tr>
</tbody></table>
<p><strong>Shared ideas</strong>: <em>size classes</em> round a request up to a fixed set of sizes (a 33-byte object takes a 48-byte slot), bounding internal fragmentation and making free lists trivial; <em>thread- or CPU-local caches</em> keep the fast path free of locks and cache-line bouncing; <em>external fragmentation</em> is free memory too scattered to satisfy a request or to give back to the OS.</p>
<p><strong>Go's allocator</strong> (TCMalloc-inspired): each P owns an <code>mcache</code> holding one <em>span</em> (a run of pages) per size class, in two flavours: "scan" spans for objects containing pointers and "noscan" spans the GC never has to scan. Allocating is a lock-free search for a free slot in that span; when it fills, the P fetches a new span from the size class's <code>mcentral</code>, which refills from the global <code>mheap</code>, which reserves 64 MiB arenas from the OS with <code>mmap</code>. Tiny pointer-free objects (&lt; 16 B) are packed together. Whether something is heap-allocated at all is decided by <strong>escape analysis</strong> (<code>go build -gcflags=-m</code>): values that do not outlive the function stay on the goroutine stack and cost the GC nothing.</p>
<p><strong>Giving memory back</strong>: freeing rarely shrinks RSS immediately. glibc can only trim the top of the heap (or unmap large chunks); Go's background <em>scavenger</em> returns free pages with <code>madvise(MADV_DONTNEED)</code> gradually, pacing itself to stay below the heap goal or <code>GOMEMLIMIT</code>, and <code>debug.FreeOSMemory()</code> forces it. RSS therefore lags the live heap after a spike, which is expected and not a leak.</p>
<p><strong>Backend relevance</strong>: C/C++ services, JVMs and cgo-heavy Go programs on glibc can grow RSS for weeks through arena fragmentation; <code>MALLOC_ARENA_MAX=2</code> or switching to jemalloc/tcmalloc is a classic fix. In pure Go, the <em>allocation rate</em> (bytes per second) drives GC CPU: reduce it with preallocated slices, fewer pointers, value types, <code>strings.Builder</code> and <code>sync.Pool</code> for large reusable buffers.</p>`,
          interview: 'Explain that the kernel hands out pages (brk/mmap, buddy allocator) while allocators carve them into objects using size classes and per-thread or per-CPU caches, and that the kernel uses slab caches for its own objects. Describe Go\'s mcache -> mcentral -> mheap path, scan vs noscan spans, escape analysis, and why RSS lags the live heap (scavenger). Mentioning glibc arena fragmentation and MALLOC_ARENA_MAX, and that allocation rate drives Go GC cost, signals real production experience.',
          examples: [
            {
              label: 'Escape analysis, gctrace and a glibc fragmentation fix',
              lang: 'bash',
              code: `$ go build -gcflags=-m ./internal/orders 2>&1 | grep -E 'escapes|moved to heap' | head -3
./orders.go:41:9: &Order{...} escapes to heap        # returned pointer: heap allocation
./orders.go:58:13: make([]byte, n) escapes to heap    # size unknown at compile time
./orders.go:72:6: moved to heap: buf                  # captured by a goroutine closure

$ GODEBUG=gctrace=1 ./api 2>&1 | head -1
gc 41 @12.103s 2%: 0.031+2.1+0.024 ms clock, 0.25+0.9/4.1/8.2+0.19 ms cpu, 412->431->208 MB, 416 MB goal, 0 MB stacks, 0 MB globals, 8 P
#   heap at GC start -> at end -> live heap; goal = live x (1 + GOGC/100)

$ slabtop -o | head -6            # kernel slab caches (dentry, inode, kmalloc-*)

# A C/C++ (or cgo-heavy) service whose RSS creeps up for days:
$ MALLOC_ARENA_MAX=2 ./legacy-service
$ grep -E '^(Rss|Pss)' /proc/$(pgrep legacy-service)/smaps_rollup`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Compute the virtual page number and offset of an address',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>4 KiB pages → offset is the low 12 bits.</li><li>Address <code>0x7f3a12345abc</code>: find VPN and offset.</li><li>Then split the VPN into the four 9-bit x86-64 page-table indexes.</li></ul>`,
          solution: `addr = 0x7f3a12345abc
offset = addr & 0xfff  = 0xabc  (2748)
VPN    = addr >> 12    = 0x7f3a12345

4-level indexes (9 bits each):
PML4 = (addr >> 39) & 0x1ff = 0x0fe (254)
PDPT = (addr >> 30) & 0x1ff = 0x0e8 (232)
PD   = (addr >> 21) & 0x1ff = 0x091 (145)
PT   = (addr >> 12) & 0x1ff = 0x145 (325)

Go check:
    a := uint64(0x7f3a12345abc)
    fmt.Printf("%#x %#x %d %d %d %d\\n", a&0xfff, a>>12,
        (a>>39)&0x1ff, (a>>30)&0x1ff, (a>>21)&0x1ff, (a>>12)&0x1ff)`,
          lang: 'text'
        },
        {
          t: 'Explain why VSZ is much larger than RSS for a Go process',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>What does VSZ count vs RSS?</li><li>Think about reserved-but-untouched mappings, thread stacks, shared libraries, and memory returned to the OS with <code>madvise</code>.</li><li>Which metric matters for container OOM kills?</li></ul>`,
          solution: `VSZ = all virtual address ranges mapped, whether or not backed by RAM.
RSS = pages actually resident in physical memory.

A Go process has large VSZ because:
- The runtime reserves address space for heap arenas and its metadata
  up front; pages are only backed on first touch (demand paging).
- Each OS thread has a reserved stack mapping.
- Freed heap pages returned via madvise(MADV_DONTNEED) stay mapped (VSZ)
  but no longer count in RSS.
- Shared libraries and mapped files count fully in VSZ.

For capacity and OOM decisions look at RSS/PSS and, in containers, cgroup
memory.current / working set (memory.current minus inactive file cache).
VSZ is almost never the right alerting metric.`,
          lang: 'text'
        },
        {
          t: 'Calculate effective memory access time with a TLB hit ratio',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>TLB lookup 1 ns, memory access 100 ns, 4-level page table (4 memory accesses on a TLB miss, no page-walk caches).</li><li>Compute EAT for hit ratios 99% and 90%.</li><li>Then: how much do 2 MiB pages help if they raise the hit ratio from 90% to 99.5% (and need only 3 levels)?</li></ul>`,
          solution: `Hit:  t_TLB + m           = 1 + 100         = 101 ns
Miss: t_TLB + 4m + m        = 1 + 400 + 100   = 501 ns

h = 0.99: EAT = 0.99*101 + 0.01*501 = 99.99 + 5.01  = 105.0 ns (5% overhead)
h = 0.90: EAT = 0.90*101 + 0.10*501 = 90.9  + 50.1  = 141.0 ns (41% overhead)

Huge pages, h = 0.995, 3-level walk on a miss (1 + 300 + 100 = 401):
EAT = 0.995*101 + 0.005*401 = 100.5 + 2.0 = 102.5 ns

Classic single-level textbook variant: EAT = h(t+m) + (1-h)(t+2m).
Real CPUs cache upper page-table levels (paging-structure caches) and PTEs
in L1/L2, so misses are often cheaper than 4 full DRAM accesses -- but
the shape of the result holds: TLB hit ratio dominates.`,
          lang: 'text'
        },
        {
          t: 'Justify multi-level page tables with a size calculation',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>48-bit virtual addresses, 4 KiB pages, 8-byte PTEs: how big is a flat table?</li><li>A process uses 64 MiB of heap, 8 MiB of stack and 20 MiB of code/libs. How many page-table pages does a 4-level tree need?</li></ul>`,
          solution: `Flat: 2^48 / 2^12 = 2^36 PTEs * 8 B = 2^39 B = 512 GiB per process. Impossible.

4-level tree, each table = 512 entries * 8 B = 4 KiB, one PT page maps
512 * 4 KiB = 2 MiB.
- Heap 64 MiB      -> 32 PT pages
- Stack 8 MiB      -> 4 PT pages
- Code/libs 20 MiB -> ~10-11 PT pages
- Upper levels: 1 PML4 + a few PDPT/PD pages (regions are far apart) ~ 5
Total ~ 52 pages * 4 KiB ~ 208 KiB of page tables.

The tree only allocates subtrees for populated regions, trading memory for
extra lookups per translation -- which the TLB hides. With 2 MiB pages the
PT level disappears for those regions (PD entries point straight at frames).`,
          lang: 'text'
        },
        {
          t: 'Explain the memory spike when Redis (or any process) forks for snapshots',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>fork() shares pages copy-on-write; what happens when the parent keeps writing?</li><li>How does transparent huge pages change the COW granularity?</li><li>What does fork() itself copy, and why does that matter for a 50 GB process?</li></ul>`,
          solution: `1. fork() copies the page TABLES (not pages): for 50 GB that's ~100 MB of
   PTEs and can block the parent for hundreds of ms (latency spike).
2. Parent and child share all pages read-only. Each parent write to a
   shared page triggers a COW fault: the kernel allocates a new page and
   copies 4 KiB. A write-heavy workload during a long snapshot can touch
   most pages -> memory approaches 2x.
3. With THP, the unit of COW is a 2 MiB page: a single 8-byte write
   copies 2 MiB -> far larger amplification. Hence "disable THP" in the
   Redis docs.

Mitigations: leave headroom (~2x for write-heavy), schedule snapshots at low
traffic, prefer replicas for persistence, disable THP, use
vm.overcommit_memory=1 so fork() isn't refused, monitor latest_fork_usec.
For Go: os/exec uses vfork-style clone, so spawning helpers from a big Go
process doesn't copy page tables.`,
          lang: 'text'
        },
        {
          t: 'Build a memory-mapped, read-only lookup table in Go',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>File format: N sorted fixed-size records of 16 bytes (8-byte key, 8-byte value, big-endian).</li><li>mmap the file, binary search with <code>sort.Search</code> over record indexes, decode with <code>encoding/binary</code>.</li><li>Consider first-access major faults and <code>MADV_WILLNEED</code>.</li></ul>`,
          solution: `//go:build linux

package mmindex

import (
    "encoding/binary"
    "errors"
    "os"
    "sort"

    "golang.org/x/sys/unix"
)

const recSize = 16

type Index struct {
    data []byte
    n    int
}

func Open(path string) (*Index, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer f.Close() // the mapping stays valid after close

    st, err := f.Stat()
    if err != nil {
        return nil, err
    }
    if st.Size()%recSize != 0 {
        return nil, errors.New("corrupt index size")
    }
    if st.Size() == 0 {
        return &Index{}, nil
    }
    data, err := unix.Mmap(int(f.Fd()), 0, int(st.Size()), unix.PROT_READ, unix.MAP_SHARED)
    if err != nil {
        return nil, err
    }
    _ = unix.Madvise(data, unix.MADV_RANDOM)    // don't read ahead for binary search
    // _ = unix.Madvise(data, unix.MADV_WILLNEED) // optionally prefault to avoid cold-start major faults
    return &Index{data: data, n: len(data) / recSize}, nil
}

func (ix *Index) key(i int) uint64 {
    return binary.BigEndian.Uint64(ix.data[i*recSize:])
}

func (ix *Index) Get(k uint64) (uint64, bool) {
    i := sort.Search(ix.n, func(i int) bool { return ix.key(i) >= k })
    if i < ix.n && ix.key(i) == k {
        return binary.BigEndian.Uint64(ix.data[i*recSize+8:]), true
    }
    return 0, false
}

func (ix *Index) Close() error {
    if ix.data == nil {
        return nil
    }
    return unix.Munmap(ix.data)
}

// Properties: zero heap allocation and zero GC scanning for any index size,
// page cache shared by every process mapping the file, instant "load".
// Caveats: replace files atomically (write new file + rename), never
// truncate in place (readers get SIGBUS); first lookups pay major faults.`,
          lang: 'go'
        },
        {
          t: 'Debug a Go container OOMKilled although the heap looks small',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Exit code 137 + reason OOMKilled → cgroup <code>memory.max</code> was hit.</li><li>Compare <code>memory.stat</code> (anon vs file vs shmem) with Go's <code>runtime/metrics</code> (heap, stacks, released memory).</li><li>Consider GOGC headroom, goroutine leaks (stacks), cgo/mmap memory and tmpfs volumes.</li></ul>`,
          solution: `Checklist
1. Confirm: kubectl describe pod -> Last State: Terminated, Reason: OOMKilled,
   Exit Code: 137. memory.events shows oom_kill > 0.
2. Where is memory charged? /sys/fs/cgroup/memory.stat:
   - anon high  -> process memory (heap, stacks, cgo)
   - shmem high -> tmpfs / emptyDir medium: Memory files
   - file high  -> page cache (usually reclaimed before OOM; not the cause
     unless dirty/locked)
3. Inside Go (runtime/metrics or /debug/pprof/heap):
   - /memory/classes/heap/objects:bytes  = live + not-yet-swept heap
   - /gc/heap/goal:bytes                 = next GC target (~2x live at GOGC=100)
   - /memory/classes/heap/stacks:bytes   = goroutine stacks (leak?)
   - /memory/classes/total:bytes vs RSS  = gap suggests cgo/mmap
   Typical finding: live heap 550 MiB, heap goal 1.1 GiB > 1 GiB limit.
4. Fixes:
   - GOMEMLIMIT=900MiB (90% of limit) so the GC collects before the limit.
   - Bound caches/queues by bytes; fix goroutine leaks (goroutine profile).
   - Stream large payloads instead of io.ReadAll.
   - Right-size the limit using p99 working set + headroom.`,
          lang: 'text'
        },
        {
          t: 'Diagnose a host that is thrashing',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Symptoms: load average high, CPU mostly idle/iowait, everything slow.</li><li>Use <code>vmstat 1</code> (si/so, b, wa), <code>sar -B</code> (majflt/s), <code>/proc/pressure/memory</code>, <code>ps -o maj_flt</code>.</li><li>Decide: reduce working set, add RAM, kill the offender, or reconfigure swap.</li></ul>`,
          solution: `$ vmstat 1
 r  b   swpd   free  ...   si    so   bi    bo  ... us sy id wa
 1 23 6201344  48120 ... 22412 30188 24800 31020 ...  3  9  8 80
-> 23 tasks blocked, constant swap-in AND swap-out, 80% iowait: thrashing.

$ cat /proc/pressure/memory
some avg10=78.21 avg60=74.02 avg300=60.11 total=...
full avg10=52.90 avg60=49.33 avg300=38.45 total=...
-> tasks stalled on memory >50% of the time.

$ ps -eo pid,comm,rss,maj_flt --sort=-maj_flt | head
-> identify the processes faulting most; compare RSS sum vs RAM.

Root cause: combined working sets > RAM (e.g. a new batch job + a JVM/Go
service with a large heap, GC touching every page).

Fix: stop/limit the offender (cgroup memory.max/memory.high), size hosts for
working sets, move the batch job, reduce heap/caches. Prefer failing fast
(OOM-kill one process) over swapping a latency-critical service; use
systemd-oomd or PSI-based killers for earlier, saner decisions.`,
          lang: 'text'
        },
        {
          t: 'Tune a Go service to live within a container memory limit',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul><li>Understand GOGC (proportional growth) vs GOMEMLIMIT (soft cap, Go 1.19+).</li><li>Measure live heap at peak load; leave room for stacks, non-heap and burst.</li><li>Beware a GC "death spiral" when live heap approaches the limit; Go caps GC CPU at ~50% to avoid stalling completely.</li><li>Export runtime/metrics to dashboards.</li></ul>`,
          solution: `Setup: container limit 2 GiB, peak live heap 1.1 GiB, GOGC=100.
Without GOMEMLIMIT: heap goal = 2.2 GiB (+ stacks/runtime) -> OOMKilled at peaks.

Option A (common): keep GOGC=100, set GOMEMLIMIT=1800MiB.
  Normal load: GC behaves as before. Near the limit, GC runs more often
  to stay under 1.8 GiB instead of crashing.

Option B (memory-dominant, steady live heap): GOGC=off + GOMEMLIMIT=1800MiB.
  GC runs only when approaching the limit -> fewer GCs, less CPU, but no
  protection if the live heap itself grows toward the limit.

Kubernetes:
  env:
  - name: GOMEMLIMIT
    valueFrom:
      resourceFieldRef: { resource: limits.memory, divisor: "1" }
  (then subtract headroom in code via debug.SetMemoryLimit(limit*9/10)
   or set a literal like 1800MiB)

Verify under load test:
- /gc/heap/goal:bytes stays under the limit,
- /cpu/classes/gc/total:cpu-seconds rate acceptable,
- container_memory_working_set_bytes < limit with ~10% headroom,
- p99 latency unchanged. If GC CPU climbs toward 50%, the live heap is too
  big for the limit: fix the data structure or raise the limit.`,
          lang: 'text'
        },
        {
          t: 'Design memory isolation for a multi-tenant worker fleet',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Tenants run user-defined jobs of unknown memory needs on shared nodes.</li><li>Tools: cgroup v2 <code>memory.max</code>/<code>memory.high</code>/<code>memory.min</code>, <code>oom_score_adj</code>, PSI, overcommit policy, swap.</li><li>What happens to the node agent (kubelet, log shipper) if a tenant explodes?</li></ul>`,
          solution: `Goals: a runaway tenant must only kill itself; platform daemons survive;
good tenants keep latency.

1. One cgroup per job with memory.max = tenant quota (hard kill boundary)
   and memory.high ~90% of it (throttle + reclaim early, giving the job
   a chance to shed load before OOM).
2. Protect system services: run them in a separate cgroup with memory.min
   (guaranteed) and oom_score_adj=-1000 for critical daemons; reserve node
   memory (kubelet --system-reserved/--kube-reserved, eviction thresholds).
3. Early detection: watch PSI (memory.pressure per cgroup); a userspace
   killer (systemd-oomd style) can act before the kernel OOM killer.
4. Overcommit: allow it (bin-pack by requests) but cap aggregate limits per
   node; avoid swap for latency-critical classes, optionally allow limited
   swap for batch tiers.
5. Workload hygiene: jobs get GOMEMLIMIT derived from their quota; tmpfs
   usage is counted -> cap emptyDir sizeLimit.
6. Observability: per-tenant memory.current, memory.events (high, max,
   oom_kill), and surfacing "killed for exceeding N MiB" to the tenant.`,
          lang: 'text'
        },
        {
          t: 'Explain why a Go service\'s RSS stays high after a traffic spike',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>After a spike the live heap drops from 3 GiB to 800 MiB, but RSS stays near 3 GiB for minutes. Is it a leak?</li><li>Compare <code>runtime/metrics</code>: <code>/memory/classes/heap/objects:bytes</code>, <code>/memory/classes/heap/free:bytes</code> and <code>/memory/classes/heap/released:bytes</code>.</li><li>How and when does the scavenger return pages? What do <code>MADV_DONTNEED</code> and <code>MADV_FREE</code> do to RSS?</li><li>What does the container's OOM logic actually count?</li></ul>`,
          solution: `Not a leak: freed heap memory is kept by the runtime and returned lazily.

1. What the metrics show
   /memory/classes/heap/objects:bytes   ~800 MiB   live + unswept objects
   /memory/classes/heap/free:bytes      ~2.1 GiB   free spans, still resident
   /memory/classes/heap/released:bytes  small      already returned to the OS
   The gap is "free but retained" memory.

2. Why it is retained
   - The GC frees objects into spans owned by the runtime, not to the OS.
   - The background scavenger returns free pages with madvise(MADV_DONTNEED)
     gradually (it targets a small share of CPU and the heap goal /
     GOMEMLIMIT), so RSS falls over minutes, not instantly.
   - Go 1.12-1.15 used MADV_FREE on Linux: pages were only reclaimed when the
     kernel needed memory, so RSS did not drop at all and confused monitoring.
     Go 1.16+ uses MADV_DONTNEED by default (GODEBUG=madvdontneed=0 reverts).

3. Does it matter?
   - The cgroup charges the resident pages, so a later spike in another
     container can push the node into pressure. Retained memory is
     reused first by the next spike, so it is rarely what causes an OOM kill.
   - If you need the memory back sooner: set GOMEMLIMIT (the scavenger works
     harder as total memory approaches it), or call debug.FreeOSMemory()
     after a known one-off spike (forces a GC + full scavenge; costly).

4. Real fix for the spike itself: bound concurrency and request body sizes,
   stream instead of buffering, and reuse large buffers, so the heap never
   grows to 3 GiB in the first place.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'What happens on a page fault? Walk through it end to end.',
          a: `<ol><li>The CPU translates a virtual address: TLB miss → hardware page walk. The PTE is not present (or the access violates its permissions), so the MMU raises a <strong>page-fault exception</strong> and records the faulting address (CR2 on x86) and access type.</li>
<li>The CPU switches to kernel mode and runs the fault handler. The kernel finds the <strong>VMA</strong> (virtual memory area) containing the address.</li>
<li><strong>No VMA or permission denied</strong> (write to read-only, user access to kernel page) → send <code>SIGSEGV</code> (or <code>SIGBUS</code> for e.g. beyond end of a mapped file). Go's runtime turns faults near nil into a <code>panic</code>.</li>
<li><strong>Valid but not present</strong>:
<ul><li>Anonymous, first touch → allocate a zeroed frame (<em>minor fault</em>).</li>
<li>File-backed and in the page cache → map the existing page (<em>minor</em>).</li>
<li>File-backed not cached, or swapped out → allocate a frame (possibly reclaiming/evicting another page), issue disk I/O, put the thread to sleep, schedule something else (<em>major fault</em>, µs–ms).</li>
<li>Write to a COW page → copy the page, map the copy writable (<em>minor</em>).</li></ul></li>
<li>Update the PTE, return from the exception, and the CPU <strong>re-executes</strong> the faulting instruction, which now succeeds.</li></ol>
<p>Why it matters: major faults are invisible latency in your code (an mmap read can block for milliseconds); first-touch minor faults make fresh allocations and startup slower; and in Go a major fault blocks the whole OS thread (M) <em>without the runtime knowing</em>: unlike a syscall there is no <code>entersyscall</code>, so sysmon does not hand the P to another thread. The goroutines queued on that P wait until the fault completes (other Ps may steal them), which is why mmap-heavy Go code can show odd latency stalls.</p>`
        },
        {
          q: 'Why do we need virtual memory, and how do page tables and the TLB make it fast enough?',
          a: `<p>Virtual memory gives each process an isolated, contiguous-looking address space, enables lazy allocation (demand paging), sharing (libraries, page cache, COW after fork), memory-mapped files, and swapping. Protection bits per page enforce read/write/execute and user/kernel separation.</p>
<p>Translation uses a multi-level page table (4 levels on x86-64, 9 bits per level + 12-bit offset), allocated sparsely. Walking it costs up to 4 memory accesses, so the <strong>TLB</strong> caches translations; with hit rates &gt;99%, overhead is a few percent. Large random-access heaps exceed TLB reach (a 1.5K-entry STLB covers only ~6 MiB of 4 KiB pages), which is when <strong>huge pages</strong> help.</p>
<p>Context-switch angle: switching processes changes the page-table root and may flush the TLB (PCID/ASID mitigate); switching threads in one process doesn't; switching goroutines doesn't even enter the kernel.</p>`
        },
        {
          q: 'How does fork() work with copy-on-write, and what are the practical gotchas?',
          a: `<p><code>fork()</code> duplicates the process: the kernel copies the page tables and marks all writable pages read-only + COW in both parent and child. Physical pages are shared until someone writes; then a page fault copies just that page. That makes fork fast relative to copying memory, and makes the common <code>fork()+exec()</code> pattern cheap.</p>
<p>Gotchas:</p>
<ul><li><strong>Page-table copy</strong> for huge processes takes noticeable time (Redis reports <code>latest_fork_usec</code>).</li>
<li><strong>COW amplification</strong>: write-heavy parents can double memory during long-lived children (snapshots); THP makes each copy 2 MiB.</li>
<li><strong>Overcommit</strong>: with strict accounting (<code>overcommit_memory=2</code>) a fork of a large process may fail with ENOMEM even though little will be copied.</li>
<li><strong>Threads</strong>: only the calling thread exists in the child; locks held by other threads stay locked forever. That's why Go never forks without exec and uses <code>clone(CLONE_VM|CLONE_VFORK)</code> for <code>os/exec</code>.</li>
<li><strong>File descriptors</strong> are inherited; use <code>O_CLOEXEC</code> (Go sets it by default) to avoid leaking sockets into children.</li></ul>`
        },
        {
          q: 'My Go service keeps getting OOMKilled in Kubernetes. How do you investigate and fix it?',
          a: `<p><strong>Confirm</strong>: exit code 137, reason OOMKilled, <code>memory.events</code> oom_kill count; check whether it was the container cgroup or node-level eviction.</p>
<p><strong>Attribute memory</strong>:</p>
<ul><li>cgroup <code>memory.stat</code>: anon (process), file (page cache, normally reclaimable), shmem (tmpfs/emptyDir in memory).</li>
<li>Go <code>runtime/metrics</code>/pprof: live heap, heap goal, stacks (goroutine leak?), released vs retained memory; RSS much larger than Go's total suggests cgo or mmap.</li></ul>
<p><strong>Common causes</strong>: GOGC=100 lets the heap goal reach 2× live heap; unbounded caches/queues; reading whole request bodies; goroutine leaks; per-request large buffers under load spikes.</p>
<p><strong>Fixes</strong>: set <code>GOMEMLIMIT</code> ≈ 90% of the limit; bound caches by bytes and queues by length (backpressure); stream with <code>io.Copy</code>; pool big buffers carefully; size the limit from load tests (p99 working set + headroom). Remember the OOM killer sends SIGKILL — graceful shutdown never runs, so in-flight requests fail.</p>`
        },
        {
          q: 'When would you use mmap instead of read()/write(), and what are the trade-offs?',
          a: `<table><thead><tr><th></th><th>mmap</th><th>read()/pread()</th></tr></thead><tbody>
<tr><td>Copies</td><td>None: you access page-cache pages directly</td><td>Kernel copies page cache → user buffer</td></tr>
<tr><td>Caching</td><td>OS-managed, shared across processes</td><td>Your own buffers/caches (or rely on page cache + copy)</td></tr>
<tr><td>I/O timing</td><td>Implicit via page faults; blocks the thread unpredictably</td><td>Explicit, can be async/batched/cancelled</td></tr>
<tr><td>Errors</td><td>SIGBUS on I/O error or truncation</td><td>Normal error returns</td></tr>
<tr><td>GC (Go)</td><td>Not scanned; large indexes cost no GC</td><td>Buffers are heap objects</td></tr>
</tbody></table>
<p>Good fits: read-mostly data much larger than you want on the heap (lookup indexes, ML models), sharing data between processes, random access to large files (bbolt/LMDB). Poor fits: write-heavy databases needing precise control of flush order and I/O scheduling (many DBs moved away from mmap for this), network file systems, and latency-critical paths where a major fault is unacceptable — in Go a fault blocks the OS thread, invisibly to the scheduler.</p>`
        }
      ],
      quiz: [
        { q: 'What is the most common page size on x86-64 Linux?', a: '4 KiB, with huge pages of 2 MiB and 1 GiB available.' },
        { q: 'How many levels does an x86-64 page table have for 48-bit addresses?', a: 'Four (PML4, PDPT, PD, PT), each indexed by 9 bits, plus a 12-bit page offset; five levels with 57-bit addressing.' },
        { q: 'What does the TLB cache?', a: 'Recent virtual-to-physical page translations (with permissions), so most accesses skip the page-table walk.' },
        { q: 'Minor vs major page fault?', a: 'A minor fault is resolved without disk I/O (zero-fill, page already in page cache, COW copy); a major fault needs to read from disk or swap.' },
        { q: 'What exit code does a container killed by the OOM killer have?', a: '137 (128 + SIGKILL 9).' },
        { q: 'What is the difference between RSS and VSZ?', a: 'VSZ is all mapped virtual address space; RSS is the part currently resident in physical RAM.' },
        { q: 'What does GOMEMLIMIT do?', a: 'Sets a soft memory limit for the Go runtime (Go 1.19+); the GC runs more aggressively as total Go memory approaches it.' },
        { q: 'Why can fork() of a 50 GB process cause a latency spike even with copy-on-write?', a: 'The kernel must still copy the page tables, and subsequent writes trigger many COW page copies.' },
        { q: 'Why does a Go process\'s RSS often stay high after its live heap shrinks?', a: 'Freed memory goes back to the runtime\'s spans first; the background scavenger returns pages to the OS gradually with madvise, so RSS lags the live heap.' },
        { q: 'What do size classes in an allocator buy you?', a: 'Requests are rounded up to a fixed set of sizes, which bounds internal fragmentation and makes per-size free lists and lock-free per-thread caches simple.' }
      ],
      resources: [
        { title: 'OSTEP — Paging: Introduction', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf', type: 'book' },
        { title: 'OSTEP — Paging: Faster Translations (TLBs)', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf', type: 'book' },
        { title: 'Linux man page — mmap(2)', url: 'https://man7.org/linux/man-pages/man2/mmap.2.html', type: 'docs' },
        { title: 'Go GC Guide — Memory limit (GOMEMLIMIT)', url: 'https://go.dev/doc/gc-guide', type: 'docs' },
        { title: 'OSTEP — Free-Space Management', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf', type: 'book' }
      ]
    },
    // ───────────────────────────── Module 5 ─────────────────────────────
    {
      n: 5,
      title: 'Processes, Threads & Scheduling',
      summary: 'Processes vs threads vs goroutines, the user/kernel boundary and system calls, context-switch costs, classic and Linux CPU schedulers, Go\'s M:N scheduler, signals and IPC — the knowledge behind concurrency, graceful shutdown and latency debugging.',
      topics: [
        {
          title: 'Processes vs Threads: Resources, PCB & Process States',
          def: `<p>A <strong>process</strong> is a running program with its own resources: a virtual address space, open file descriptors, credentials, signal handlers, cgroup/namespace membership. A <strong>thread</strong> is a schedulable flow of execution <em>inside</em> a process: it has its own registers, program counter, stack and thread-local storage, but shares everything else with the other threads of its process.</p>
<table><thead><tr><th></th><th>Process</th><th>Thread</th><th>Goroutine</th></tr></thead><tbody>
<tr><td>Address space</td><td>Private</td><td>Shared with siblings</td><td>Shared (one Go process)</td></tr>
<tr><td>Scheduled by</td><td>Kernel</td><td>Kernel</td><td>Go runtime (onto OS threads)</td></tr>
<tr><td>Stack</td><td>—</td><td>Fixed, ~8 MiB reserved (<code>ulimit -s</code>)</td><td>Starts ~2 KiB, grows/shrinks by copying</td></tr>
<tr><td>Create cost</td><td>~100 µs+ (fork/exec)</td><td>~10–20 µs</td><td>&lt; 1 µs</td></tr>
<tr><td>Switch cost</td><td>µs + TLB/cache effects</td><td>~1–5 µs (kernel)</td><td>~100–200 ns (user space)</td></tr>
<tr><td>Isolation</td><td>Strong (crash contained)</td><td>None (one crash kills all)</td><td>None (unrecovered panic kills process)</td></tr>
</tbody></table>
<p>The kernel tracks each task in a <strong>process control block</strong> (Linux: <code>task_struct</code>, used for both processes and threads — a thread is a task sharing an mm with others): PID/TID, state, saved registers, scheduling info, memory map pointer, open files table, credentials, accounting.</p>
<p><strong>States</strong> (textbook): New → Ready → Running → Waiting (blocked) → Terminated. Linux <code>ps</code> codes: <code>R</code> running/runnable, <code>S</code> interruptible sleep, <code>D</code> uninterruptible sleep (usually disk/NFS I/O — counts toward load average!), <code>T</code> stopped, <code>Z</code> zombie (exited, parent hasn't called <code>wait()</code>).</p>
<p><strong>Containers</strong>: your app is often PID 1, which must reap orphaned zombie children and gets no default signal actions (an unhandled SIGTERM may be ignored). Handle signals explicitly and use a tiny init (<code>tini</code>, <code>docker run --init</code>) if you spawn children.</p>`,
          interview: 'Be crisp: processes own resources and isolation, threads share the address space but have their own stack/registers, goroutines are runtime-scheduled user-space threads multiplexed onto OS threads. Expect follow-ups on Linux states (D state and load average), zombies vs orphans, and PID 1 in containers.',
          examples: [
            {
              label: 'Threads, states and context-switch counters of a Go process',
              lang: 'bash',
              code: `$ ps -o pid,nlwp,stat,rss,comm -p $(pgrep api)
    PID NLWP STAT   RSS COMMAND
   4121   14 Ssl  612344 api          # 14 OS threads (M's) for thousands of goroutines

$ ps -eLo pid,tid,stat,comm | awk '$1==4121' | head -4
   4121    4121 Ssl  api
   4121    4122 Ssl  api
   4121    4123 Ssl  api
   4121    4127 Rl   api              # one thread currently running

$ grep -E 'State|Threads|ctxt' /proc/4121/status
State:  S (sleeping)
Threads:        14
voluntary_ctxt_switches:        18233     # blocked/yielded (I/O, futex)
nonvoluntary_ctxt_switches:     912       # preempted by the scheduler`
            }
          ]
        },
        {
          title: 'User Mode vs Kernel Mode & System Calls',
          def: `<p>CPUs run in privilege levels. Applications run in <strong>user mode</strong> (ring 3 on x86, EL0 on ARM) and cannot touch hardware, page tables or other processes. The kernel runs in <strong>kernel mode</strong> (ring 0 / EL1). The only ways into the kernel are <strong>system calls</strong>, exceptions (page faults, divide errors) and hardware interrupts.</p>
<p>A system call on x86-64 Linux:</p>
<ol><li>The libc wrapper or Go's <code>syscall</code> package puts the syscall number in <code>RAX</code> and arguments in registers.</li>
<li>The <code>syscall</code> instruction switches to ring 0, jumps to the kernel entry point and swaps to the kernel stack.</li>
<li>The kernel validates arguments (copying user buffers carefully), does the work, and returns with <code>sysret</code>.</li></ol>
<table><thead><tr><th>Operation</th><th>Rough cost</th></tr></thead><tbody>
<tr><td>Function call</td><td>~1 ns</td></tr>
<tr><td>vDSO call (<code>clock_gettime</code>)</td><td>~20 ns (no kernel entry)</td></tr>
<tr><td>Trivial syscall (<code>getppid</code>)</td><td>~100–300 ns (more with Spectre/Meltdown mitigations)</td></tr>
<tr><td><code>read</code>/<code>write</code> of small buffers</td><td>~0.5–2 µs</td></tr>
</tbody></table>
<p>The <strong>vDSO</strong> maps a few read-only kernel functions (time queries) into every process so they avoid the mode switch — that's why <code>time.Now()</code> is cheap in Go.</p>
<p><strong>Design implications</strong>: batch syscalls (buffered I/O with <code>bufio</code>, <code>writev</code>, larger reads), avoid per-byte <code>Write</code> on unbuffered files/sockets, and use mechanisms that reduce crossings (epoll, io_uring, sendfile). <code>strace</code> shows every syscall but slows the target heavily (ptrace); prefer <code>perf trace</code> or eBPF tools in production.</p>
<p><strong>Go</strong>: blocking syscalls take the OS thread with them; the runtime notices (<code>entersyscall</code>) and hands the P to another thread so other goroutines keep running.</p>`,
          interview: 'Explain the privilege boundary, the syscall instruction path, and rough costs (function ~1 ns, syscall ~100s of ns, vDSO avoids the switch). Show you design to minimise crossings (buffering, batching, epoll/io_uring) and know strace vs perf trace overhead.',
          examples: [
            {
              label: 'Count syscalls with strace (unbuffered vs buffered writes)',
              lang: 'bash',
              code: `# Program writes 100k small lines to a file, first unbuffered, then with bufio.Writer
$ strace -c -f ./writer-unbuffered
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
 97.81    0.912345           9    100000           write
  ...
$ strace -c -f ./writer-bufio
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
 61.02    0.004112          17       239           write      # 4 KiB buffer -> ~400x fewer syscalls
  ...
# Low-overhead alternative in production:
$ sudo perf trace -s -p $(pgrep api) -- sleep 10`
            }
          ]
        },
        {
          title: 'Context Switching & Its Cost',
          def: `<p>A <strong>context switch</strong> saves the running task's CPU state (registers, PC, stack pointer, FPU/vector state) into its kernel structures and restores another task's. Triggers:</p>
<ul><li><strong>Voluntary</strong>: the task blocks — I/O, <code>futex</code> wait (mutex/cond), <code>sleep</code>, waiting on a pipe/socket.</li>
<li><strong>Involuntary</strong>: the scheduler preempts it — time slice used up, or a higher-priority task woke up.</li></ul>
<table><thead><tr><th>Cost component</th><th>Detail</th></tr></thead><tbody>
<tr><td>Direct</td><td>Kernel entry, scheduler decision, register/FPU save-restore: ~1–3 µs</td></tr>
<tr><td>Address-space switch</td><td>Different process → new page-table root; TLB flush unless PCID/ASID</td></tr>
<tr><td>Indirect (often larger)</td><td>Cold caches, TLB and branch predictors for the incoming task; can add tens of µs of slowdown</td></tr>
<tr><td>Goroutine switch</td><td>User-space: save ~3 registers into the <code>g</code>, ~100–200 ns, no kernel, no TLB change</td></tr>
</tbody></table>
<p>At 10,000 switches/s per core, the direct cost is ~1–3% of a core; at 100,000+/s per core you are spending a large fraction of CPU in the scheduler, visible as high <strong>system (sy) CPU</strong> and a high <code>cs</code> column in <code>vmstat</code>.</p>
<p>Common causes of switch storms: thread-per-connection servers with thousands of threads; lock contention (threads sleeping and waking on futexes); tiny producer/consumer handoffs between threads; timers firing at very high rates; oversubscription (more runnable threads than cores, e.g. GOMAXPROCS above the CPU quota).</p>
<p>This is the core argument for <strong>event-driven</strong> I/O and <strong>M:N scheduling</strong>: Go parks a goroutine waiting on a socket in user space and keeps the OS thread busy with other goroutines, so a server with 100k connections needs only about GOMAXPROCS busy threads.</p>`,
          interview: 'Quantify: thread switch ~1-5 us direct plus cache/TLB pollution; goroutine switch ~100-200 ns in user space. Know voluntary vs involuntary switches, the tools (vmstat cs, pidstat -w, /proc/PID/status, perf sched) and causes like lock contention and oversubscription.',
          examples: [
            {
              label: 'Find who is context switching',
              lang: 'bash',
              code: `$ vmstat 1 3
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
38  0      0 812344  10240 4120332    0    0     0    12 52110 486233 31 52 17  0  0
#            38 runnable on 16 CPUs, 486k context switches/s, 52% system CPU

$ pidstat -w 1 1
Average:      UID       PID   cswch/s nvcswch/s  Command
Average:     1000      7781 401233.00  61022.00  legacy-worker   # voluntary: futex/IO waits
Average:     1000      4121    812.00     40.00  api

$ sudo perf sched record -- sleep 5 && sudo perf sched latency --sort max | head`
            }
          ]
        },
        {
          title: 'CPU Scheduling Algorithms & the Linux Scheduler',
          def: `<p>Scheduler goals conflict: throughput, low response time, fairness, and meeting deadlines. Classic algorithms:</p>
<table><thead><tr><th>Algorithm</th><th>Rule</th><th>Strength</th><th>Weakness</th></tr></thead><tbody>
<tr><td>FCFS</td><td>Run in arrival order</td><td>Simple</td><td>Convoy effect: short jobs wait behind long ones</td></tr>
<tr><td>SJF / SRTF</td><td>Shortest (remaining) job first</td><td>Optimal average waiting time</td><td>Needs burst prediction; starves long jobs</td></tr>
<tr><td>Round Robin</td><td>Fixed time slice, rotate</td><td>Good response time, fair</td><td>Quantum too small → switch overhead; too large → FCFS</td></tr>
<tr><td>Priority</td><td>Highest priority first</td><td>Expresses importance</td><td>Starvation (fix: aging); priority inversion</td></tr>
<tr><td>MLFQ</td><td>Multiple queues; demote CPU hogs, keep interactive jobs high; periodic boost</td><td>Approximates SJF without knowing burst lengths</td><td>Tuning; gaming</td></tr>
</tbody></table>
<p><strong>Linux</strong>: the default class for normal tasks was <strong>CFS</strong> (Completely Fair Scheduler, 2007–2023): each task accumulates <em>virtual runtime</em> weighted by its nice value; the task with the smallest vruntime (leftmost in a red-black tree) runs next. Since <strong>Linux 6.6</strong> the default is <strong>EEVDF</strong> (Earliest Eligible Virtual Deadline First); the transition was completed in 6.12 (delayed dequeue, per-task slice requests) and the old CFS pick logic is gone, although the code still lives in <code>kernel/sched/fair.c</code> and the "fair class" and "CFS bandwidth" names remain.</p>
<p><strong>How EEVDF picks</strong>:</p>
<ul><li>Each task still accumulates weighted virtual runtime. Its <strong>lag</strong> is the service it is owed: (the weighted average vruntime of the queue) minus (its own vruntime).</li>
<li>A task is <strong>eligible</strong> when its lag is ≥ 0, i.e. it has not received more than its fair share.</li>
<li>Each task has a <strong>virtual deadline</strong> = eligible time + slice / weight. Among eligible tasks the one with the <em>earliest deadline</em> runs (tasks are kept in an augmented red-black tree).</li>
<li>Consequence: a task that asks for a short slice (latency-sensitive) gets an earlier deadline and runs sooner, without receiving more total CPU; fairness and latency are decoupled. Since 6.12 a task can request its slice via <code>sched_setattr()</code>. CFS needed heuristics (wake-up preemption, sleeper credit) to approximate this.</li></ul>
<p>Other classes: <code>SCHED_FIFO</code>/<code>SCHED_RR</code> (real-time, always beat normal tasks), <code>SCHED_DEADLINE</code> (runtime/period reservations), <code>SCHED_BATCH</code>, <code>SCHED_IDLE</code>. Since 6.12, <strong><code>sched_ext</code></strong> lets a BPF program implement the scheduling policy (examples: <code>scx_rusty</code>, <code>scx_lavd</code>, <code>scx_layered</code>, used at Meta and by gaming distros); if the BPF scheduler misbehaves or stalls a task, the kernel's watchdog ejects it and falls back to the fair class. 6.12 also merged <strong>PREEMPT_RT</strong> into mainline.</p>
<ul><li><strong>nice</strong> −20…19: each step ≈ 10% CPU share difference (weights ×1.25).</li>
<li>Per-CPU run queues with load balancing; affinity via <code>taskset</code>/cpusets.</li>
<li><strong>cgroup CPU control</strong>: <code>cpu.weight</code> (shares, from K8s requests) and <code>cpu.max</code> quota/period (from K8s limits) → <strong>bandwidth throttling</strong> (still called "CFS throttling" under EEVDF) when the quota is exhausted; <code>cpu.max.burst</code> lets a cgroup bank unused quota for short bursts.</li></ul>`,
          interview: 'Be able to compute waiting/turnaround times for FCFS, SJF and RR on a small example, explain MLFQ\'s rules, and describe CFS (vruntime, red-black tree, nice weights) and how EEVDF, the default since Linux 6.6, picks the eligible task (lag >= 0) with the earliest virtual deadline. Knowing sched_ext (BPF schedulers, 6.12) shows currency. Backend tie-in: cgroup cpu.weight from requests, cpu.max quotas from limits, and throttling causing tail latency.',
          examples: [
            {
              label: 'FCFS vs SJF vs Round Robin on one workload',
              lang: 'text',
              code: `Jobs (all arrive at t=0): P1 = 24 ms, P2 = 3 ms, P3 = 3 ms

FCFS (P1,P2,P3):  |P1.....................24|P2 27|P3 30|
  waiting:    P1=0  P2=24 P3=27  -> avg 17.0 ms
  turnaround: 24, 27, 30         -> avg 27.0 ms

SJF (P2,P3,P1):   |P2 3|P3 6|P1....................30|
  waiting:    P2=0  P3=3  P1=6   -> avg  3.0 ms
  turnaround: 3, 6, 30           -> avg 13.0 ms

RR, quantum 4 ms: |P1 4|P2 7|P3 10|P1 14|P1 18|P1 22|P1 26|P1 30|
  waiting:    P1=6  P2=4  P3=7   -> avg  5.67 ms
  turnaround: 30, 7, 10          -> avg 15.67 ms
  response (first run): 0, 4, 7  -> avg  3.67 ms

Convoy effect: under FCFS the two short jobs wait behind the long one.`
            }
          ]
        },
        {
          title: 'Kernel Threads vs Green Threads & Go\'s M:N Scheduler',
          def: `<p>Threading models:</p>
<ul><li><strong>1:1</strong> (kernel threads): each user thread is a kernel thread — Java platform threads, pthreads. Simple, true parallelism, but creation/switching cost and memory limit you to thousands.</li>
<li><strong>N:1</strong> (green threads): many user threads on one kernel thread — cheap, but no parallelism and one blocking syscall blocks all.</li>
<li><strong>M:N</strong>: many user threads multiplexed onto a pool of kernel threads — Go goroutines, Erlang processes, Java virtual threads (21+).</li></ul>
<p>Go's scheduler uses <strong>G-M-P</strong>:</p>
<table><thead><tr><th>Entity</th><th>What it is</th></tr></thead><tbody>
<tr><td><strong>G</strong></td><td>Goroutine: stack (starts small, grows by copying), saved PC/SP, status</td></tr>
<tr><td><strong>M</strong></td><td>Machine: an OS thread that executes Go code</td></tr>
<tr><td><strong>P</strong></td><td>Processor: a scheduling context with a local run queue (256 Gs) and memory caches; <code>GOMAXPROCS</code> of them</td></tr>
</tbody></table>
<ul><li>An M must hold a P to run Go code. Each P runs Gs from its local queue (plus a <code>runnext</code> slot for the most recently readied G), occasionally checks the global queue, and when empty <strong>steals half</strong> of another P's queue.</li>
<li><strong>Network I/O</strong>: a G blocking on a socket is parked; the fd is registered with the <strong>netpoller</strong> (epoll/kqueue/IOCP); the M keeps running other Gs.</li>
<li><strong>Blocking syscalls / cgo</strong>: the M blocks in the kernel; <code>sysmon</code> detects it and <strong>hands off</strong> the P to another (possibly new) M.</li>
<li><strong>Preemption</strong>: cooperative at function calls plus <strong>asynchronous preemption</strong> via signals (Go 1.14+); sysmon preempts Gs running longer than ~10 ms, so tight loops can't starve others.</li>
<li><code>runtime.LockOSThread</code> pins a G to its M (needed for thread-affine C libraries, Linux namespaces, OpenGL).</li></ul>`,
          interview: 'Draw G, M and P and explain run queues, work stealing, the netpoller, syscall handoff and async preemption. Contrast 1:1, N:1 and M:N models. A classic question is "what happens when a goroutine makes a blocking syscall vs a network read" — answer with handoff vs netpoller.',
          examples: [
            {
              label: 'Observe the Go scheduler with schedtrace',
              lang: 'bash',
              code: `$ GODEBUG=schedtrace=1000 ./api 2>&1 | grep SCHED
SCHED 1004ms: gomaxprocs=8 idleprocs=0 threads=14 spinningthreads=1 needspinning=0 idlethreads=4 runqueue=12 [5 3 0 7 2 9 1 4]
SCHED 2008ms: gomaxprocs=8 idleprocs=6 threads=14 spinningthreads=0 needspinning=0 idlethreads=10 runqueue=0 [0 0 0 1 0 0 0 0]
#  gomaxprocs = number of P's      threads = M's (OS threads)
#  runqueue   = global run queue   [..]    = per-P local run queue lengths
#  Persistent non-zero queues with idleprocs=0 -> CPU saturated (scale out or optimise).

# Deeper: go tool trace shows each P's timeline, syscalls, GC and blocking.
$ curl -o trace.out 'http://localhost:6060/debug/pprof/trace?seconds=5' && go tool trace trace.out`
            }
          ]
        },
        {
          title: 'Signals & Inter-Process Communication',
          def: `<p><strong>Signals</strong> are asynchronous notifications delivered to a process or thread:</p>
<table><thead><tr><th>Signal</th><th>Default</th><th>Typical use</th></tr></thead><tbody>
<tr><td>SIGTERM (15)</td><td>Terminate</td><td>Polite shutdown request (Kubernetes, systemd, <code>kill</code>)</td></tr>
<tr><td>SIGINT (2)</td><td>Terminate</td><td>Ctrl+C</td></tr>
<tr><td>SIGKILL (9)</td><td>Terminate — cannot be caught</td><td>Force kill, OOM killer, K8s after grace period</td></tr>
<tr><td>SIGHUP (1)</td><td>Terminate</td><td>Conventionally "reload config"</td></tr>
<tr><td>SIGQUIT (3)</td><td>Core dump</td><td>Go prints all goroutine stacks and exits</td></tr>
<tr><td>SIGCHLD</td><td>Ignore</td><td>Child exited — parent should <code>wait()</code></td></tr>
<tr><td>SIGPIPE</td><td>Terminate</td><td>Write to closed pipe/socket (Go returns EPIPE instead, except on stdout/stderr)</td></tr>
<tr><td>SIGSEGV/SIGBUS</td><td>Core dump</td><td>Invalid memory access</td></tr>
</tbody></table>
<p>Kubernetes shutdown: endpoint removal + <code>preStop</code> hook → SIGTERM → wait <code>terminationGracePeriodSeconds</code> (default 30 s) → SIGKILL. In Go, use <code>signal.NotifyContext</code> and <code>http.Server.Shutdown</code>.</p>
<p><strong>How a signal is delivered</strong>:</p>
<ol><li><strong>Generate</strong>: <code>kill()</code>/<code>tgkill()</code>, the terminal, or the kernel itself (a fault, a child exiting, a broken pipe) marks the signal <em>pending</em>, either on the whole process (shared pending set) or on one thread.</li>
<li><strong>Pick a thread</strong>: each thread has a <em>signal mask</em>. A process-directed signal goes to any thread that does not block it; synchronous signals from faults (<code>SIGSEGV</code>, <code>SIGBUS</code>, <code>SIGFPE</code>) always go to the faulting thread.</li>
<li><strong>Deliver</strong>: nothing happens until that thread next returns from the kernel to user mode (end of a syscall, interrupt or reschedule; a sleeping thread is woken). The kernel then applies the disposition: default action, ignore, or push a signal frame on the user stack (or the <code>sigaltstack</code>) and jump to the handler; <code>sigreturn</code> restores the interrupted context afterwards.</li>
<li><strong>Side effects</strong>: a blocking syscall that was interrupted returns <code>EINTR</code> or is restarted (<code>SA_RESTART</code>). Standard signals do not queue (two <code>SIGCHLD</code>s can merge into one, so reap in a loop); real-time signals do. Handlers may only call async-signal-safe functions. <code>signalfd</code> and <code>pidfd</code> turn signals and process exits into file descriptors for event loops.</li></ol>
<p><strong>Go</strong>: the runtime installs handlers on every thread. Faults become panics (nil dereference) or fatal errors; <code>signal.Notify</code> relays asynchronous signals to a channel with a non-blocking send (use a buffered channel); <code>SIGPROF</code> drives the CPU profiler; <code>SIGQUIT</code> dumps all goroutine stacks; and since Go 1.14 the runtime sends itself <code>SIGURG</code> for asynchronous preemption, so <code>EINTR</code> appears more often in syscalls, cgo code and <code>strace</code> output (Go's own wrappers retry).</p>
<p><strong>IPC mechanisms</strong>:</p>
<table><thead><tr><th>Mechanism</th><th>Properties</th><th>Typical use</th></tr></thead><tbody>
<tr><td>Pipe / FIFO</td><td>One-way byte stream, kernel buffer (64 KiB default)</td><td>Shell pipelines, child stdin/stdout via <code>os/exec</code></td></tr>
<tr><td>Unix domain socket</td><td>Bidirectional stream/datagram, same host, can pass fds and peer credentials, no TCP overhead</td><td>Docker/containerd APIs, sidecars, local Postgres</td></tr>
<tr><td>TCP/UDP socket</td><td>Across hosts, full network stack</td><td>Microservices</td></tr>
<tr><td>Shared memory (<code>shm_open</code>/<code>mmap</code>)</td><td>Zero-copy, fastest; you must synchronise yourself</td><td>Databases, high-frequency data, ring buffers</td></tr>
<tr><td>Message queues (POSIX/System V)</td><td>Kernel-held discrete messages with priorities</td><td>Legacy/embedded; rare in cloud services</td></tr>
<tr><td>Signals</td><td>Tiny notification, no payload</td><td>Control: shutdown, reload</td></tr>
</tbody></table>`,
          interview: 'Know which signals can\'t be caught (SIGKILL, SIGSTOP), how delivery works (pending sets, per-thread masks, handlers run on the return to user mode, EINTR), that Go uses SIGURG for async preemption, the Kubernetes termination sequence and how to implement graceful shutdown in Go. For IPC, compare pipes, Unix domain sockets, TCP and shared memory by speed, scope and complexity, and justify a choice for a sidecar or local agent.',
          examples: [
            {
              label: 'Graceful shutdown on SIGTERM in Go',
              lang: 'go',
              code: `package main

import (
    "context"
    "errors"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    srv := &http.Server{Addr: ":8080", Handler: http.DefaultServeMux,
        ReadHeaderTimeout: 5 * time.Second}

    go func() {
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            log.Fatal(err)
        }
    }()

    <-ctx.Done() // SIGTERM from Kubernetes (or Ctrl+C)
    stop()       // a second signal now kills immediately
    log.Println("shutting down")

    // Must finish well within terminationGracePeriodSeconds (default 30s).
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
    defer cancel()
    if err := srv.Shutdown(shutdownCtx); err != nil { // stop accepting, drain in-flight
        log.Printf("forced shutdown: %v", err)
    }
}`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'List what threads share and what they do not',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Think: address space, heap, globals, code, file descriptors, signal handlers, cwd, PID.</li><li>Per-thread: registers, PC, stack, TLS, signal mask, errno, scheduling state.</li><li>How does this map onto goroutines?</li></ul>`,
          solution: `Shared by all threads of a process:
- Virtual address space: code, globals, heap, memory mappings
- File descriptor table (sockets, files), current directory, umask
- Signal handlers (dispositions), PID, user/group IDs, resource limits
- cgroup and namespace membership

Private to each thread:
- Registers, program counter, stack pointer, its own stack
- Thread-local storage, errno
- Signal mask and pending thread-directed signals
- Scheduling state, priority, CPU affinity, TID

Goroutines: share everything in the Go process; each has its own small
growable stack, saved PC/SP, and status. There is no goroutine-local
storage by design -- pass context.Context explicitly.`,
          lang: 'text'
        },
        {
          t: 'Trace and count the system calls of a Go program',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul><li>Write 100,000 short lines to a file with <code>f.Write</code>, then with <code>bufio.Writer</code>.</li><li>Run both under <code>strace -c -f</code> and compare <code>write</code> call counts and time.</li><li>Why <code>-f</code>? (Go uses several OS threads.)</li></ul>`,
          solution: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    f, err := os.Create("/tmp/out.txt")
    if err != nil {
        panic(err)
    }
    defer f.Close()

    var w interface{ Write([]byte) (int, error) } = f
    var bw *bufio.Writer
    if len(os.Args) > 1 && os.Args[1] == "buffered" {
        bw = bufio.NewWriterSize(f, 64<<10)
        w = bw
    }
    for i := 0; i < 100_000; i++ {
        fmt.Fprintf(w, "line %d\\n", i)
    }
    if bw != nil {
        if err := bw.Flush(); err != nil {
            panic(err)
        }
    }
}

// $ go build -o writer . && strace -c -f ./writer             -> ~100000 write calls
// $ strace -c -f ./writer buffered                             -> ~20 write calls
// -f follows all threads: the Go runtime runs goroutines on multiple Ms.
// strace uses ptrace and slows syscall-heavy programs dramatically -- use
// perf trace or bpftrace on production hosts.`,
          lang: 'go'
        },
        {
          t: 'Compute waiting and turnaround times for FCFS, SJF and Round Robin',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>Jobs: A arrives 0 (burst 8), B arrives 1 (burst 4), C arrives 2 (burst 9), D arrives 3 (burst 5).</li><li>Compute for FCFS, preemptive SJF (SRTF) and RR with quantum 4.</li><li>waiting = turnaround − burst; turnaround = completion − arrival.</li></ul>`,
          solution: `FCFS: A 0-8, B 8-12, C 12-21, D 21-26
  turnaround: A 8, B 11, C 19, D 23  -> avg 15.25
  waiting:    A 0, B 7,  C 10, D 18  -> avg 8.75

SRTF: A 0-1, B 1-5, D 5-10, A 10-17, C 17-26
  completion: A 17, B 5, C 26, D 10
  turnaround: A 17, B 4, C 24, D 7   -> avg 13.0
  waiting:    A 9,  B 0, C 15, D 2   -> avg 6.5

RR q=4 (new arrivals queued before the preempted job):
  A 0-4, B 4-8, C 8-12, D 12-16, A 16-20, C 20-24, D 24-25, C 25-26
  completion: A 20, B 8, C 26, D 25
  turnaround: A 20, B 7, C 24, D 22  -> avg 18.25
  waiting:    A 12, B 3, C 15, D 17  -> avg 11.75
  response:   A 0,  B 3, C 6,  D 9   -> avg 4.5

SRTF minimises average waiting; RR gives bounded response time at the cost
of turnaround; FCFS suffers the convoy effect.`,
          lang: 'text'
        },
        {
          t: 'Compare the cost of 100,000 goroutines with OS threads',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Spawn 100k goroutines that block on a channel; measure time and <code>runtime.MemStats.StackInuse</code>/<code>Sys</code>.</li><li>Compare with the per-thread cost: 8 MiB reserved stack, ~10–20 µs creation, kernel task struct and kernel stack.</li><li>Why can't you just create 100k threads? (<code>threads-max</code>, <code>pid_max</code>, <code>ulimit -u</code>, Go's <code>SetMaxThreads</code> default 10,000.)</li></ul>`,
          solution: `package main

import (
    "fmt"
    "runtime"
    "sync"
    "time"
)

func main() {
    const n = 100_000
    var before, after runtime.MemStats
    runtime.GC()
    runtime.ReadMemStats(&before)

    block := make(chan struct{})
    var wg sync.WaitGroup
    start := time.Now()
    for i := 0; i < n; i++ {
        wg.Add(1)
        go func() { defer wg.Done(); <-block }()
    }
    elapsed := time.Since(start)
    runtime.ReadMemStats(&after)

    fmt.Printf("goroutines=%d spawn=%v (%v each)\\n", runtime.NumGoroutine(), elapsed, elapsed/n)
    fmt.Printf("stacks=%d MiB, per goroutine ~%d bytes\\n",
        (after.StackInuse-before.StackInuse)>>20, (after.Sys-before.Sys)/n)
    close(block)
    wg.Wait()
}

// Illustrative linux/amd64 output:
//   goroutines=100001 spawn=38ms (380ns each)
//   stacks=196 MiB, per goroutine ~2600 bytes
// (Windows reserves larger minimum stacks, ~8 KiB.)
//
// 100k OS threads: ~1-2 s just to create, 800 GB of reserved stack address
// space, ~16 KiB kernel stack each plus scheduler overhead -- and you'd
// hit default limits first. Goroutines are cheap because stacks start tiny
// and switching happens in user space without the kernel.`,
          lang: 'go'
        },
        {
          t: 'Implement graceful shutdown for an HTTP server and background workers',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Use <code>signal.NotifyContext</code> for SIGINT/SIGTERM.</li><li>Stop accepting traffic (<code>srv.Shutdown</code>), cancel workers via context, wait with <code>sync.WaitGroup</code> or <code>errgroup</code>, with an overall deadline below the K8s grace period.</li><li>Readiness should fail first so the load balancer drains you.</li></ul>`,
          solution: `package main

import (
    "context"
    "errors"
    "log"
    "net/http"
    "os/signal"
    "sync/atomic"
    "syscall"
    "time"

    "golang.org/x/sync/errgroup"
)

func main() {
    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    var shuttingDown atomic.Bool
    mux := http.NewServeMux()
    mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
        if shuttingDown.Load() {
            http.Error(w, "draining", http.StatusServiceUnavailable)
            return
        }
        w.WriteHeader(http.StatusOK)
    })
    srv := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5 * time.Second}

    g, gctx := errgroup.WithContext(ctx)
    g.Go(func() error {
        if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
            return err
        }
        return nil
    })
    g.Go(func() error { return runWorker(gctx) }) // exits when gctx is cancelled

    g.Go(func() error {
        <-gctx.Done()
        shuttingDown.Store(true)
        time.Sleep(5 * time.Second) // let endpoints/LB observe not-ready (or use a preStop hook)
        sctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
        defer cancel()
        return srv.Shutdown(sctx) // drains in-flight requests
    })

    if err := g.Wait(); err != nil {
        log.Printf("exit: %v", err)
    }
}

func runWorker(ctx context.Context) error {
    t := time.NewTicker(time.Second)
    defer t.Stop()
    for {
        select {
        case <-ctx.Done():
            return nil // finish current item, flush, return
        case <-t.C:
            // process a batch
        }
    }
}`,
          lang: 'go'
        },
        {
          t: 'Diagnose high system CPU from context switches',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Symptoms: <code>sy</code> 40–60% in <code>top</code>/<code>vmstat</code>, <code>cs</code> column in the hundreds of thousands per second, throughput flat.</li><li>Find the process with <code>pidstat -w</code>; voluntary vs non-voluntary tells you blocking vs preemption.</li><li>Use <code>perf top</code>/<code>perf record -g</code> (look for futex, schedule, __switch_to) and, for Go, the mutex/block profiles.</li></ul>`,
          solution: `1. Confirm: vmstat 1 -> cs ~480k/s, sy 52%, r (runnable) >> CPUs.
2. Attribute: pidstat -w 1 -> legacy-worker: cswch/s 400k (voluntary).
   Voluntary = threads blocking/waking (futex, I/O). Non-voluntary =
   preempted (too many runnable threads for the CPUs).
3. Why: perf record -g -p <pid>; perf report -> hot paths in
   futex_wait/futex_wake, schedule, __switch_to; app frames show a single
   mutex-protected queue shared by 512 worker threads, each item handed off
   individually (wake one thread per item).
   For a Go service: go tool pprof /debug/pprof/mutex and /block, plus
   GODEBUG=schedtrace to see spinning threads and run queues.
4. Fixes:
   - Fewer threads: pool sized ~ number of cores (or GOMAXPROCS for Go).
   - Batch handoffs (take N items per lock acquisition), shard the queue
     per worker, or use lock-free/SPSC structures.
   - Remove timer storms (e.g. thousands of goroutines doing time.Sleep(1ms)).
   - Ensure GOMAXPROCS <= CPU quota (avoid oversubscription + throttling).
5. Verify: cs drops to ~20k/s, sy < 10%, throughput +2x.`,
          lang: 'text'
        },
        {
          t: 'Run a child process and stream data through pipes with os/exec',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li><code>cmd.StdinPipe()</code>/<code>StdoutPipe()</code> create pipes; the child inherits the fds.</li><li>Write and read concurrently, or you can deadlock when a pipe buffer (64 KiB) fills.</li><li>Close stdin to signal EOF; always <code>cmd.Wait()</code> to reap the child (avoid zombies).</li></ul>`,
          solution: `package main

import (
    "bufio"
    "context"
    "fmt"
    "os/exec"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    cmd := exec.CommandContext(ctx, "sort", "-n") // child process
    stdin, err := cmd.StdinPipe()
    if err != nil {
        panic(err)
    }
    stdout, err := cmd.StdoutPipe()
    if err != nil {
        panic(err)
    }
    if err := cmd.Start(); err != nil { // clone+exec, pipes attached to fds 0 and 1
        panic(err)
    }

    // Writer goroutine: if we wrote everything before reading, a large input
    // would fill the child's stdout pipe, the child would block, stop reading
    // stdin, and we'd deadlock.
    go func() {
        defer stdin.Close() // EOF tells sort to finish
        for i := 1000; i > 0; i-- {
            fmt.Fprintln(stdin, i)
        }
    }()

    sc := bufio.NewScanner(stdout)
    n := 0
    for sc.Scan() {
        n++
    }
    if err := cmd.Wait(); err != nil { // reaps the child: no zombie
        panic(err)
    }
    fmt.Println("lines:", n)
}`,
          lang: 'go'
        },
        {
          t: 'Explain why a goroutine blocked in a syscall does not stall other goroutines',
          d: 'hard',
          type: 'concept',
          hint: `<ul><li>Distinguish network I/O (netpoller) from file I/O / blocking syscalls / cgo.</li><li>What do <code>entersyscall</code>/<code>exitsyscall</code> do with the P?</li><li>What is <code>sysmon</code>'s role? What happens to thread count if many goroutines block in syscalls?</li></ul>`,
          solution: `Network I/O: sockets are non-blocking. A Read that would block returns
EAGAIN; the runtime registers the fd with the netpoller (epoll), parks the
goroutine (G state: waiting) and the M picks another runnable G. When epoll
reports readiness, the G is made runnable again. No OS thread is blocked.

Blocking syscalls (regular file I/O, some syscalls) and cgo calls:
1. entersyscall: the G/M mark that they are in a syscall; the P is left in
   _Psyscall state, still attached.
2. If the syscall returns quickly (< ~20 us), exitsyscall reacquires the
   same P cheaply -- no handoff.
3. If it takes longer, sysmon (a runtime thread with no P) "retakes" the P
   and hands it to another M (waking an idle one or creating a new thread),
   so the other goroutines keep running on GOMAXPROCS Ps.
4. When the syscall returns, the M tries to get a P; if none is free, its G
   goes to the global run queue and the M parks.

Consequence: 1,000 goroutines stuck in slow disk/NFS reads or cgo calls can
create ~1,000 OS threads (limit: debug.SetMaxThreads, default 10,000 ->
crash). Bound concurrency for blocking work with a semaphore/worker pool.`,
          lang: 'text'
        },
        {
          t: 'Debug p99 latency spikes caused by CPU throttling in Kubernetes',
          d: 'hard',
          type: 'debug',
          hint: `<ul><li>Average CPU usage is well below the limit, yet p99 latency has periodic 50–100 ms spikes.</li><li>Look at <code>cpu.stat</code> (<code>nr_throttled</code>, <code>throttled_usec</code>) and <code>container_cpu_cfs_throttled_periods_total</code>.</li><li>How does a 100 ms CFS period interact with bursty, multi-threaded work and GC?</li></ul>`,
          solution: `Mechanism: limits.cpu: 2 -> cpu.max "200000 100000": 200 ms of CPU time per
100 ms period, shared by ALL threads. If 16 threads (GOMAXPROCS=16 on a
16-core node, Go < 1.25) run in parallel during a burst or GC cycle, they
consume 200 ms of quota in ~12.5 ms of wall time; the cgroup is throttled
for the remaining ~87 ms. Any request in flight waits -> p99 spike, while
average utilisation still looks like 40%.

Evidence:
  $ cat /sys/fs/cgroup/cpu.stat
  usage_usec 912345678
  nr_periods 120034
  nr_throttled 18022          # 15% of periods throttled
  throttled_usec 1022334455
  Prometheus: rate(container_cpu_cfs_throttled_periods_total[5m]) /
              rate(container_cpu_cfs_periods_total[5m])

Fixes:
- Match GOMAXPROCS to the quota (Go 1.25+ does it automatically; otherwise
  automaxprocs or GOMAXPROCS env).
- Raise or remove the CPU limit for latency-critical services; keep
  requests for scheduling/fair share (cpu.weight).
- Reduce burstiness: GC tuning (GOMEMLIMIT/GOGC), bounded worker pools.
- Re-check: throttled ratio ~0, p99 back to baseline.`,
          lang: 'text'
        },
        {
          t: 'Choose an IPC mechanism for a local sidecar agent',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Main service sends ~50k small events/s to a local agent (metrics/logs/auth decisions) in the same pod.</li><li>Compare loopback TCP, Unix domain sockets, shared-memory ring buffer, pipes.</li><li>Consider latency, throughput, failure isolation, security (file permissions, peer credentials), operability and language support.</li></ul>`,
          solution: `Options
1. Loopback TCP (127.0.0.1): universal, works with gRPC/HTTP; full TCP/IP
   stack per message (checksums, ACK logic) -> ~2x the CPU of UDS.
2. Unix domain socket (stream or SOCK_SEQPACKET): same API as TCP, no
   network stack, ~30-50% lower latency and CPU; access controlled by
   filesystem permissions on the socket path; SO_PEERCRED gives the peer
   PID/UID; can pass file descriptors. Share via an emptyDir volume.
3. Shared-memory ring buffer (memfd/mmap): lowest latency (~100s of ns),
   zero-copy, but you must implement framing, synchronisation (atomics +
   futex/eventfd wakeups), crash recovery and versioning yourself; a bug in
   either side corrupts the other.
4. Pipes: one-way, parent/child relationship -- awkward for sidecars.

Recommendation: gRPC (or a simple length-prefixed protocol) over a Unix
domain socket, with batching (send events in batches of N or every 10 ms),
bounded client-side queue and drop/backpressure policy if the agent is slow,
and timeouts so the main service never blocks on the agent. Reach for shared
memory only if profiling proves UDS is the bottleneck (it rarely is at 50k/s).`,
          lang: 'text'
        },
        {
          t: 'Reap zombie processes as PID 1 in a container',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Your Go binary is PID 1 and runs helper scripts that themselves spawn background children. <code>ps</code> shows a growing number of <code>Z</code> entries.</li><li>Who adopts orphaned processes, and who must call <code>wait()</code> on them?</li><li>Why does PID 1 not get default signal actions, and what does that mean for SIGTERM?</li><li>Options: reap in your program, <code>tini</code>/<code>docker run --init</code>, or Kubernetes <code>shareProcessNamespace</code> (the pause container becomes PID 1 and reaps).</li></ul>`,
          solution: `//go:build linux

package main

import (
    "os"
    "os/signal"
    "syscall"
)

// reapLoop collects every exited child, including orphans re-parented to us.
// SIGCHLD does not queue, so one signal may stand for several exits: loop
// with WNOHANG until there is nothing left.
func reapLoop() {
    sigs := make(chan os.Signal, 16)
    signal.Notify(sigs, syscall.SIGCHLD)
    for range sigs {
        for {
            var ws syscall.WaitStatus
            pid, err := syscall.Wait4(-1, &ws, syscall.WNOHANG, nil)
            if pid <= 0 || err != nil {
                break // 0: children still running; ECHILD: none left
            }
        }
    }
}

func main() {
    go reapLoop()
    // The kernel applies no default actions to a namespace's init: a PID 1
    // without a handler (a shell script, many runtimes) IGNORES SIGTERM, so the
    // pod waits out the grace period and is SIGKILLed. The Go runtime does
    // install handlers, so an unhandled SIGTERM makes it exit at once (status
    // 2), skipping graceful shutdown. Either way, handle it explicitly:
    term := make(chan os.Signal, 1)
    signal.Notify(term, syscall.SIGTERM, syscall.SIGINT)
    // ... start the server and helpers ...
    <-term
    // forward the signal to children / process group, drain, then exit
}

// Caveat: Wait4(-1) also reaps children started with os/exec, so a later
// cmd.Wait() fails with "no child processes". Either own all reaping in this
// loop, or (simpler and safer) run under a minimal init:
//   ENTRYPOINT ["/sbin/tini", "--", "/app/server"]     (or docker run --init)
// or set shareProcessNamespace: true in the pod spec so the pause container
// is PID 1 and reaps zombies.`,
          lang: 'go'
        },
        {
          t: 'Compute CPU shares from nice values and cgroup weights',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>The fair class gives each runnable task CPU in proportion to its weight. nice 0 = 1024, nice 5 = 335, nice −5 = 3121 (each step ≈ ×1.25).</li><li>Part 1: tasks at nice 0 and nice 5 compete for one CPU. Shares?</li><li>Part 2: on a busy 4-core node, pod A requests 500m and pod B requests 2000m, no limits, both CPU-bound. How does Kubernetes turn requests into <code>cpu.weight</code>, and how many cores does each get?</li><li>Part 3: what changes if pod A also has <code>limits.cpu: 500m</code>?</li></ul>`,
          solution: `Part 1 -- nice
  share(nice 0) = 1024 / (1024 + 335) = 75.3%
  share(nice 5) =  335 / (1024 + 335) = 24.7%
  Under EEVDF and CFS alike, weights set the long-run share; EEVDF only
  changes WHO runs next (earliest eligible virtual deadline), not how much.

Part 2 -- cgroup v2 weights from requests
  kubelet: shares = millicores * 1024 / 1000   (cgroup v1 cpu.shares)
           cpu.weight = 1 + ((shares - 2) * 9999) / 262142   (v2 conversion)
  Pod A: 500m  -> shares 512  -> weight 1 + 510*9999/262142  = 20
  Pod B: 2000m -> shares 2048 -> weight 1 + 2046*9999/262142 = 79
  Contended 4 cores: A gets 4 * 20/99 = 0.81 cores, B gets 3.19 cores
  (about the 1:4 ratio of the requests).
  If B goes idle, A may use all 4 cores: weights are not caps.

Part 3 -- limits are a separate mechanism
  limits.cpu 500m -> cpu.max "50000 100000": at most 50 ms of CPU per 100 ms
  period, even on an idle node. A's share is capped at 0.5 cores; with
  GOMAXPROCS=4 it can burn its 50 ms in ~12.5 ms and is then throttled for
  the rest of each period (nr_throttled in cpu.stat). Requests decide
  fairness under contention; limits decide the ceiling and cause throttling.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'Process vs thread vs goroutine: what are the differences and when do they matter?',
          a: `<table><thead><tr><th></th><th>Process</th><th>OS thread</th><th>Goroutine</th></tr></thead><tbody>
<tr><td>Memory</td><td>Own address space</td><td>Shares process memory; own ~8 MiB reserved stack</td><td>Shares; ~2 KiB initial growable stack</td></tr>
<tr><td>Scheduler</td><td>Kernel</td><td>Kernel (preemptive)</td><td>Go runtime, M:N onto threads (cooperative + async preemption)</td></tr>
<tr><td>Creation</td><td>fork/exec, ~100 µs–ms</td><td>clone, ~10–20 µs</td><td>~0.3–1 µs</td></tr>
<tr><td>Switch</td><td>Kernel + address-space switch</td><td>Kernel, ~1–5 µs</td><td>User space, ~100–200 ns</td></tr>
<tr><td>Communication</td><td>IPC (pipes, sockets, shm)</td><td>Shared memory + locks</td><td>Channels or shared memory + sync</td></tr>
<tr><td>Failure isolation</td><td>Strong</td><td>None</td><td>None (unrecovered panic kills the process)</td></tr>
</tbody></table>
<p>When it matters: use <strong>processes</strong> for isolation (crash domains, security, different languages — and in cloud-native, separate containers/pods). Use <strong>goroutines</strong> for massive concurrency (one per connection/request) because they're cheap to create and park. OS threads still matter underneath: blocking syscalls and cgo consume them, <code>GOMAXPROCS</code> bounds parallelism, and context switches between threads cost real CPU. Mention <code>LockOSThread</code> for thread-affine work.</p>`
        },
        {
          q: 'How does Go\'s scheduler work? What happens when a goroutine blocks?',
          a: `<p><strong>G-M-P</strong>: Gs (goroutines) run on Ms (OS threads), and an M needs a P (one of GOMAXPROCS logical processors, each with a local run queue) to execute Go code.</p>
<ul><li><strong>Scheduling</strong>: each P pops from its local queue (with a <code>runnext</code> fast path for producer/consumer handoffs), checks the global queue every 61 ticks for fairness, polls the netpoller, and steals half of a random P's queue when idle.</li>
<li><strong>Channel/mutex block</strong>: G is parked on the channel/semaphore wait queue; the M immediately runs another G. Waking puts it back on a run queue — no kernel involvement.</li>
<li><strong>Network I/O</strong>: non-blocking fd + netpoller (epoll/kqueue); G parked until readiness.</li>
<li><strong>Blocking syscall/cgo</strong>: M blocks; sysmon retakes its P after ~20 µs and hands it to another M, so parallelism is preserved; more threads may be created.</li>
<li><strong>Preemption</strong>: function-call checks plus signal-based async preemption (Go 1.14+) for Gs running &gt;10 ms; GC also needs to stop goroutines at safe points.</li></ul>
<p>Practical consequences: millions of goroutines are fine if they mostly wait; CPU-bound work beyond GOMAXPROCS just queues; leaked goroutines leak memory (stacks); blocking file/cgo calls can explode thread counts.</p>`
        },
        {
          q: 'What happens during a system call, and why should backend engineers care about the cost?',
          a: `<p>The program places the syscall number and arguments in registers and executes <code>syscall</code> (x86-64) / <code>svc</code> (ARM64). The CPU switches to kernel mode, jumps to the entry point and switches to the kernel stack; with KPTI it also switches page tables. The kernel validates and copies arguments from user memory, performs the operation (possibly blocking and scheduling another task), then returns to user mode.</p>
<p>Cost: ~100 ns for a trivial call, more with mitigations and cache pollution; blocking calls add a context switch each way. A service doing one <code>write</code> per log line or per small response chunk can spend most of its CPU in the kernel.</p>
<p>Techniques: buffering (<code>bufio</code>), vectored I/O (<code>writev</code> — used by Go's <code>net.Buffers</code>), larger reads, epoll to wait on many sockets with one call, <code>sendfile</code>/<code>splice</code> for zero-copy, io_uring for batched async submission, vDSO for time. Measure with <code>strace -c</code> (dev), <code>perf trace</code>/eBPF (prod), and watch <code>sy</code> CPU.</p>`
        },
        {
          q: 'Explain the Linux CFS/EEVDF scheduler and how Kubernetes CPU requests and limits map onto it.',
          a: `<p><strong>CFS</strong> gives each runnable task a share of CPU proportional to its weight (derived from nice). It tracks <em>vruntime</em> — actual runtime scaled inversely by weight — and always runs the task with the smallest vruntime, stored in a red-black tree. <strong>EEVDF</strong> (default since Linux 6.6) keeps the same proportional-share idea but tracks each task's <em>lag</em> (service owed) and picks the eligible task with the earliest virtual deadline, improving latency for tasks that request short slices.</p>
<p>Group scheduling applies the same fairness to cgroups:</p>
<ul><li><strong>requests.cpu</strong> → <code>cpu.weight</code> (relative share under contention; no cap).</li>
<li><strong>limits.cpu</strong> → <code>cpu.max</code> quota per period (default 100 ms). Exceeding the quota throttles the whole cgroup until the next period, even if the node is idle.</li></ul>
<p>Consequences: multi-threaded bursts (GC, parallel request handling) can burn the quota in a few ms and stall for the rest of the period, causing tail-latency spikes. Mitigate by aligning GOMAXPROCS with the limit (automatic in Go 1.25+), using requests without limits for latency-critical services, or using the static CPU manager for exclusive cores.</p>`
        }
      ],
      quiz: [
        { q: 'Which two signals cannot be caught or ignored?', a: 'SIGKILL and SIGSTOP.' },
        { q: 'What is a zombie process?', a: 'A process that has exited but whose parent has not yet called wait() to collect its exit status.' },
        { q: 'What does Linux process state D mean?', a: 'Uninterruptible sleep, usually waiting on disk or network filesystem I/O; such tasks count toward load average.' },
        { q: 'What are G, M and P in Go\'s scheduler?', a: 'G is a goroutine, M is an OS thread, P is a logical processor holding a run queue; GOMAXPROCS sets the number of Ps.' },
        { q: 'Why is time.Now() cheap even though it reads a kernel clock?', a: 'It uses the vDSO, which maps clock-reading code and data into user space, avoiding a system call.' },
        { q: 'Which classic scheduling algorithm minimises average waiting time?', a: 'Shortest Job First (or its preemptive form, Shortest Remaining Time First).' },
        { q: 'Which scheduler replaced CFS as the Linux default, and in which version?', a: 'EEVDF (Earliest Eligible Virtual Deadline First), in Linux 6.6.' },
        { q: 'Which IPC mechanism can pass file descriptors between processes?', a: 'Unix domain sockets (SCM_RIGHTS ancillary messages).' },
        { q: 'When is a task eligible under EEVDF, and which eligible task runs?', a: 'It is eligible when its lag is non-negative (it has not received more than its fair share); among eligible tasks the one with the earliest virtual deadline runs.' },
        { q: 'Why might a Go program see more EINTR errors than a C program?', a: 'Since Go 1.14 the runtime sends SIGURG to threads for asynchronous preemption, interrupting blocking syscalls; Go\'s own wrappers retry, but cgo or raw syscalls must handle EINTR.' }
      ],
      resources: [
        { title: 'OSTEP — Scheduling: Multi-Level Feedback Queue', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf', type: 'book' },
        { title: 'OSTEP — Mechanism: Limited Direct Execution (syscalls, context switches)', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf', type: 'book' },
        { title: 'Linux man page — sched(7)', url: 'https://man7.org/linux/man-pages/man7/sched.7.html', type: 'docs' },
        { title: 'Linux man page — signal(7)', url: 'https://man7.org/linux/man-pages/man7/signal.7.html', type: 'docs' },
        { title: 'Linux kernel docs — EEVDF Scheduler', url: 'https://docs.kernel.org/scheduler/sched-eevdf.html', type: 'docs' },
        { title: 'Linux kernel docs — Extensible Scheduler Class (sched_ext)', url: 'https://docs.kernel.org/scheduler/sched-ext.html', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 6 ─────────────────────────────
    {
      n: 6,
      title: 'Concurrency & Synchronization',
      summary: 'Races and critical sections, the synchronization toolbox (mutexes, spinlocks, semaphores, condition variables, RW locks, atomics/CAS), memory ordering, and the failure modes — deadlock, livelock, starvation, priority inversion — with the classic problems solved in Go.',
      topics: [
        {
          title: 'Race Conditions & Critical Sections',
          def: `<p>A <strong>race condition</strong> is a bug where correctness depends on the relative timing of concurrent operations. A <strong>data race</strong> is a specific kind: two goroutines/threads access the same memory concurrently, at least one writes, and there is no synchronization ordering them. In Go (as in C/C++/Java) a data race is a correctness bug, full stop — the program's behaviour is no longer described by simple interleavings.</p>
<p>Classic shapes:</p>
<ul><li><strong>Read-modify-write</strong>: <code>counter++</code> is load, add, store — two goroutines can both load 5 and both store 6 (lost update).</li>
<li><strong>Check-then-act</strong>: <code>if _, ok := m[k]; !ok { m[k] = v }</code>, "if balance ≥ amount then withdraw", lazy initialisation.</li>
<li><strong>Publication without synchronization</strong>: setting a <code>ready</code> flag after writing data, with the reader polling the flag.</li></ul>
<p>A <strong>critical section</strong> is code that accesses shared state and must not be executed by more than one thread at a time. Any correct solution guarantees <strong>mutual exclusion</strong>, <strong>progress</strong> (if nobody is inside, someone waiting can enter) and <strong>bounded waiting</strong> (no starvation).</p>
<p><strong>Go specifics</strong>:</p>
<ul><li>Concurrent map writes are detected by the runtime and crash the program: <code>fatal error: concurrent map writes</code> (not recoverable).</li>
<li>The <strong>race detector</strong> (<code>go test -race</code>, <code>go run -race</code>) instruments memory accesses and reports races that actually happen during the run. It costs ~2–20× CPU and 5–10× memory, so run it in CI and staging.</li>
<li>Slices, maps, strings headers and interfaces are multi-word values — a racy read can observe a torn value (e.g. new pointer with old length) and crash.</li></ul>
<p>Strategies: don't share (confine data to one goroutine, communicate by channels), share immutable data, or synchronize every access (mutex/atomics).</p>`,
          interview: 'Distinguish race condition (logic depends on timing) from data race (unsynchronized conflicting accesses). Show the counter++ lost update and check-then-act examples, mention Go\'s race detector and the fatal concurrent map write, and state the three strategies: confine, make immutable, or synchronize.',
          examples: [
            {
              label: 'A data race caught by the race detector',
              lang: 'go',
              code: `package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup
    counter := 0
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            counter++ // load, add, store: not atomic
        }()
    }
    wg.Wait()
    fmt.Println(counter) // often < 1000
}

// $ go run -race main.go
// ==================
// WARNING: DATA RACE
// Read at 0x00c000012128 by goroutine 8:
//   main.main.func1()  main.go:15 +0x84
// Previous write at 0x00c000012128 by goroutine 7:
//   main.main.func1()  main.go:15 +0x96
// ==================
// Fix: sync.Mutex around counter++, or atomic.Int64 / counter.Add(1).`
            }
          ]
        },
        {
          title: 'Mutexes, Spinlocks & Reader-Writer Locks',
          def: `<p>A <strong>mutex</strong> provides mutual exclusion: <code>Lock</code> blocks until the lock is free. Implementations combine a fast path (one atomic CAS when uncontended, ~10–25 ns) with a slow path that puts the waiter to sleep (Linux <code>futex</code>; in Go, the runtime parks the <em>goroutine</em>, not the OS thread).</p>
<table><thead><tr><th>Lock</th><th>Waiting strategy</th><th>Use when</th></tr></thead><tbody>
<tr><td>Spinlock</td><td>Busy-wait in a loop</td><td>Critical sections of a few dozen ns, holder cannot be preempted (kernel with interrupts/preemption disabled)</td></tr>
<tr><td>Blocking mutex</td><td>Sleep, woken by unlocker</td><td>General purpose user-space code</td></tr>
<tr><td>Adaptive mutex</td><td>Spin briefly, then sleep</td><td>Default in glibc/Go: best of both</td></tr>
<tr><td>Reader-writer lock</td><td>Many readers or one writer</td><td>Read-heavy data, readers do non-trivial work</td></tr>
</tbody></table>
<p>User-space spinlocks are dangerous: if the holder is preempted, waiters burn whole time slices spinning. They also generate coherence traffic on the lock's cache line.</p>
<p><strong>Go's <code>sync.Mutex</code></strong>: CAS fast path; brief spinning only if multicore and other Ps are running; then the goroutine is queued on a runtime semaphore. <strong>Normal mode</strong> lets a newly arriving goroutine barge in (better throughput); if a waiter has waited &gt;1 ms the mutex switches to <strong>starvation mode</strong> and hands ownership directly to waiters in FIFO order. Not reentrant: locking twice in one goroutine deadlocks.</p>
<p><strong><code>sync.RWMutex</code></strong>: once a writer is waiting, new <code>RLock</code> calls block (prevents writer starvation). Consequences: recursive read locking can deadlock if a writer arrives in between, and under high core counts readers still contend on the reader-count cache line — for tiny critical sections a plain <code>Mutex</code> is often faster. For read-mostly config, an <code>atomic.Pointer</code> to an immutable snapshot beats both.</p>
<p>Rules: keep critical sections short, never do I/O or call unknown code while holding a lock, use <code>defer mu.Unlock()</code> unless profiling says otherwise, and put the mutex next to the data it guards.</p>`,
          interview: 'Explain spinning vs blocking and why user-space spinlocks are risky (preemption of the holder), describe Go\'s mutex normal vs starvation mode, and know RWMutex gotchas: recursive RLock deadlock with a pending writer, and why RWMutex can be slower than Mutex for short sections. Mention atomic.Pointer snapshots for read-mostly data.',
          examples: [
            {
              label: 'Mutex-protected cache vs copy-on-write snapshot',
              lang: 'go',
              code: `// Read-write cache: mutex guards the map.
type Cache struct {
    mu sync.RWMutex
    m  map[string]string
}

func (c *Cache) Get(k string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.m[k]
    return v, ok
}

func (c *Cache) Set(k, v string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.m[k] = v
}

// Read-mostly config: readers never lock; writers publish a new immutable map.
type Config struct{ p atomic.Pointer[map[string]string] }

func (c *Config) Get(k string) string { return (*c.p.Load())[k] }

func (c *Config) Replace(next map[string]string) { // next must not be mutated afterwards
    c.p.Store(&next)
}`
            }
          ]
        },
        {
          title: 'Semaphores & Condition Variables',
          def: `<p>A <strong>semaphore</strong> (Dijkstra) is an integer counter with two atomic operations: <strong>P/wait/acquire</strong> (decrement; block if it would go negative) and <strong>V/signal/release</strong> (increment; wake a waiter). A <em>binary</em> semaphore behaves like a lock (but any thread may release it); a <em>counting</em> semaphore limits concurrency to N — connection pools, rate of parallel downloads, bounded worker counts.</p>
<p>In Go: a buffered channel <code>make(chan struct{}, N)</code> is a counting semaphore, and <code>golang.org/x/sync/semaphore.Weighted</code> adds weights and context-aware acquisition; <code>errgroup.Group.SetLimit</code> bounds goroutines.</p>
<p>A <strong>condition variable</strong> lets threads sleep until some predicate over shared state becomes true. It is always used with a mutex (the "monitor" pattern):</p>
<ol><li>Lock the mutex.</li>
<li><strong><code>for !predicate { cond.Wait() }</code></strong> — Wait atomically unlocks the mutex and sleeps; on wakeup it re-locks before returning.</li>
<li>Act on the state, unlock.</li></ol>
<p>The loop (not <code>if</code>) is essential: wakeups can be <strong>spurious</strong>, and another thread may consume the condition between the signal and your reacquisition of the lock. <strong>Signal</strong> wakes one waiter; <strong>Broadcast</strong> wakes all (needed when waiters wait for different predicates or on shutdown).</p>
<p>Go's <code>sync.Cond</code> exists but its docs recommend channels for most cases: <code>Wait</code> cannot be combined with <code>select</code>, timeouts or context cancellation. Use <code>sync.Cond</code> for many-waiter broadcast state changes or when you need a monitor around complex state; otherwise use channels.</p>`,
          interview: 'Define semaphore operations and contrast binary semaphore vs mutex (ownership). For condition variables, the must-say points are: always used with a mutex, Wait releases and reacquires the lock, wait in a for loop because of spurious wakeups, Signal vs Broadcast. In Go, show the channel-as-semaphore idiom.',
          examples: [
            {
              label: 'Bounding concurrency with a channel semaphore',
              lang: 'go',
              code: `// Fetch many URLs but never more than 8 at a time.
func fetchAll(ctx context.Context, urls []string) []error {
    sem := make(chan struct{}, 8) // counting semaphore, capacity = permits
    errs := make([]error, len(urls))
    var wg sync.WaitGroup
    for i, u := range urls {
        select {
        case sem <- struct{}{}: // acquire (P)
        case <-ctx.Done():
            errs[i] = ctx.Err()
            continue
        }
        wg.Add(1)
        go func() {
            defer wg.Done()
            defer func() { <-sem }() // release (V)
            errs[i] = fetch(ctx, u)
        }()
    }
    wg.Wait()
    return errs
}

// Equivalent with errgroup:
//   g, ctx := errgroup.WithContext(ctx); g.SetLimit(8)
//   for _, u := range urls { g.Go(func() error { return fetch(ctx, u) }) }
//   err := g.Wait()`
            }
          ]
        },
        {
          title: 'Atomics, Compare-and-Swap, Lock-Free Structures & ABA',
          def: `<p><strong>Atomic operations</strong> are indivisible read-modify-write instructions executed by the hardware (<code>LOCK XADD</code>, <code>LOCK CMPXCHG</code> on x86; LSE <code>LDADD</code>/<code>CAS</code> or LL/SC on ARM64). Go exposes them via <code>sync/atomic</code>; prefer the typed API (<code>atomic.Int64</code>, <code>atomic.Bool</code>, <code>atomic.Pointer[T]</code>), which also guarantees 64-bit alignment.</p>
<p><strong>Compare-and-swap</strong>: <code>CAS(addr, old, new)</code> sets <code>*addr = new</code> only if <code>*addr == old</code>, returning success. It enables optimistic, retry-based algorithms:</p>
<p><code>for { old := x.Load(); new := f(old); if x.CompareAndSwap(old, new) { break } }</code></p>
<table><thead><tr><th>Progress guarantee</th><th>Meaning</th></tr></thead><tbody>
<tr><td>Blocking</td><td>A stalled lock holder can stop everyone</td></tr>
<tr><td>Lock-free</td><td>Some thread always makes progress (system-wide)</td></tr>
<tr><td>Wait-free</td><td>Every thread completes in a bounded number of steps</td></tr>
</tbody></table>
<p><strong>The ABA problem</strong>: thread 1 reads <code>head = A</code>, prepares <code>CAS(head, A, A.next)</code>, and is delayed. Thread 2 pops A, pops B, then pushes A back (or a new node reusing A's freed address). Thread 1's CAS succeeds because head is "A" again, but <code>A.next</code> is stale (points to B, now freed) — the structure is corrupted. Fixes: version/tag counters packed with the pointer (double-width CAS), hazard pointers, epoch-based reclamation, or a garbage collector.</p>
<p>In Go, the GC prevents the classic memory-reuse ABA: a node cannot be freed and reallocated while any goroutine still holds a pointer to it. ABA can still occur with index-based structures, pooled/reused nodes (<code>sync.Pool</code>) or plain integer states.</p>
<p>Reality check: lock-free code is hard to get right and not automatically faster — contended CAS loops bounce cache lines just like locks. Use atomics for counters, flags and pointer swaps of immutable snapshots; reach for lock-free data structures only after profiling.</p>`,
          interview: 'Explain CAS and a retry loop, lock-free vs wait-free, and walk through ABA step by step with the standard fixes (tagged pointers, hazard pointers, epochs, GC). Pointing out that Go\'s GC prevents pointer-reuse ABA (but not ABA with pooled nodes or indices) is a strong signal.',
          examples: [
            {
              label: 'CAS retry loop: a lock-free max tracker',
              lang: 'go',
              code: `// Track the maximum latency observed across goroutines without a mutex.
type MaxTracker struct{ v atomic.Int64 }

func (m *MaxTracker) Observe(x int64) {
    for {
        cur := m.v.Load()
        if x <= cur {
            return // nothing to do
        }
        if m.v.CompareAndSwap(cur, x) {
            return // we installed the new max
        }
        // CAS failed: another goroutine changed v; reload and retry.
    }
}

// (Go 1.23+ also has atomic And/Or; there is no atomic Max, hence the loop.)`
            }
          ]
        },
        {
          title: 'Memory Ordering, Barriers & the Go Memory Model',
          def: `<p>Both the <strong>compiler</strong> and the <strong>CPU</strong> reorder memory operations when a single thread can't tell the difference: hoisting loads out of loops, keeping values in registers, store buffers that delay writes, out-of-order loads. Other threads <em>can</em> tell.</p>
<table><thead><tr><th>Architecture</th><th>Model</th><th>Visible reorderings</th></tr></thead><tbody>
<tr><td>x86-64</td><td>TSO (total store order)</td><td>Only store → later load (via the store buffer)</td></tr>
<tr><td>ARM64, POWER</td><td>Weak</td><td>Load/load, load/store, store/store, store/load</td></tr>
</tbody></table>
<p>The <strong>store-buffer litmus test</strong>: <code>x = y = 0</code>; T1: <code>x = 1; r1 = y</code>; T2: <code>y = 1; r2 = x</code>. Intuitively at least one of r1/r2 is 1, but on x86 <code>r1 == r2 == 0</code> is possible because each store sits in its core's store buffer while the load proceeds.</p>
<p><strong>Memory barriers (fences)</strong> restrict reordering: full fences (<code>MFENCE</code>, <code>DMB ISH</code>), and acquire/release semantics — a <em>release</em> store makes all earlier writes visible to a thread that performs an <em>acquire</em> load of the same location.</p>
<p><strong>Go's memory model</strong> defines <em>happens-before</em> via synchronization: a channel send happens before the corresponding receive completes; <code>Unlock</code> happens before the next <code>Lock</code>; <code>sync.Once</code>'s function happens before any <code>Do</code> returns; and <code>sync/atomic</code> operations are <strong>sequentially consistent</strong> (like C++ <code>seq_cst</code>). If your program is data-race-free, it behaves as if executed sequentially consistently (DRF-SC). You never write barriers in Go — you use these primitives, and the compiler emits the right instructions for each architecture.</p>
<p>Classic broken pattern: double-checked locking with a plain boolean. Use <code>sync.Once</code> / <code>sync.OnceValue</code> instead.</p>`,
          interview: 'Explain that compilers and CPUs reorder, contrast x86 TSO with ARM\'s weak model, describe acquire/release and happens-before, and state Go\'s guarantees: race-free programs are sequentially consistent, atomics are seq-cst, and channels/mutexes/Once establish happens-before. Use the flag-and-data publication bug as the example.',
          examples: [
            {
              label: 'Broken publication and the fix',
              lang: 'go',
              code: `// BROKEN: data race. The compiler may hoist the load of ready out of the
// loop (spins forever), and on ARM the reader may see ready==true but data==0.
var data int
var ready bool

func producer() { data = 42; ready = true }
func consumer() {
    for !ready {
    }
    fmt.Println(data)
}

// FIXED with an atomic flag: Store (release) ... Load (acquire) creates
// happens-before, so data = 42 is visible once ready is observed.
var data2 int
var ready2 atomic.Bool

func producer2() { data2 = 42; ready2.Store(true) }
func consumer2() {
    for !ready2.Load() {
        runtime.Gosched()
    }
    fmt.Println(data2) // always 42
}

// IDIOMATIC: just send the value.
func producer3(ch chan<- int) { ch <- 42 }
func consumer3(ch <-chan int) { fmt.Println(<-ch) }`
            }
          ]
        },
        {
          title: 'Deadlock, Livelock, Starvation & Priority Inversion',
          def: `<p>A <strong>deadlock</strong> is a set of threads each waiting for a resource held by another in the set. It requires all four <strong>Coffman conditions</strong>:</p>
<ol><li><strong>Mutual exclusion</strong> — resources can't be shared.</li>
<li><strong>Hold and wait</strong> — threads hold resources while requesting more.</li>
<li><strong>No preemption</strong> — resources can't be forcibly taken.</li>
<li><strong>Circular wait</strong> — a cycle in the wait-for graph.</li></ol>
<table><thead><tr><th>Strategy</th><th>How</th><th>Practice</th></tr></thead><tbody>
<tr><td>Prevention</td><td>Break a condition</td><td><strong>Global lock ordering</strong> (breaks circular wait), acquire all-or-nothing (<code>TryLock</code> and back off), lock-free/immutable data</td></tr>
<tr><td>Avoidance</td><td>Only grant requests that keep the system in a safe state</td><td><strong>Banker's algorithm</strong>: needs max claims in advance — rare outside textbooks/embedded</td></tr>
<tr><td>Detection &amp; recovery</td><td>Find cycles in the wait-for graph, abort a victim</td><td>Databases (deadlock detector aborts a transaction), timeouts</td></tr>
<tr><td>Ignore</td><td>Ostrich algorithm</td><td>Most OSes for user resources</td></tr>
</tbody></table>
<p><strong>Livelock</strong>: threads keep changing state in response to each other but make no progress (two people stepping aside in a corridor; retry loops that collide repeatedly). Fix with randomized backoff/jitter. <strong>Starvation</strong>: a thread never gets the resource (unfair locks, reader-preferring RW locks, low priority). Fix with fairness/FIFO handoff and aging. Go's mutex starvation mode exists for this.</p>
<p><strong>Priority inversion</strong>: a high-priority task waits for a lock held by a low-priority task, which is preempted by a medium-priority task — so the high-priority task effectively waits for the medium one. It caused resets on NASA's Mars Pathfinder (1997). Fix: <strong>priority inheritance</strong> (the holder temporarily gets the waiter's priority) or priority ceilings.</p>
<p>Go detects only <em>global</em> deadlock (<code>fatal error: all goroutines are asleep - deadlock!</code>). Partial deadlocks in servers just hang requests — find them with goroutine dumps (<code>/debug/pprof/goroutine?debug=2</code> or SIGQUIT) and prevent them with lock ordering and context timeouts.</p>`,
          interview: 'Recite the four Coffman conditions and map each prevention technique to the condition it breaks, explain banker\'s algorithm in one sentence (grant only if a safe sequence exists), and distinguish livelock, starvation and priority inversion with fixes. In Go, mention goroutine dumps for partial deadlocks.',
          examples: [
            {
              label: 'Wait-for graph of a transfer deadlock',
              lang: 'text',
              code: `G1: transfer(A -> B)   locks A, then wants B
G2: transfer(B -> A)   locks B, then wants A

      holds              wants
  G1 -------> [A]   G1 ---------> [B]
  G2 -------> [B]   G2 ---------> [A]

  Wait-for graph:  G1 --> G2 --> G1   (cycle = deadlock)

Goroutine dump (SIGQUIT or /debug/pprof/goroutine?debug=2):
goroutine 18 [sync.Mutex.Lock, 5 minutes]:
  main.transfer(0xc000010000, 0xc000010018, 0x64)  bank.go:21
goroutine 19 [sync.Mutex.Lock, 5 minutes]:
  main.transfer(0xc000010018, 0xc000010000, 0x32)  bank.go:21

Fix: always lock the account with the lower ID first (global order).`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Find and fix the race in a request counter',
          d: 'easy',
          type: 'debug',
          hint: `<ul><li><code>stats.requests++</code> runs in every HTTP handler goroutine.</li><li>Reproduce with <code>go test -race</code> and a test that sends concurrent requests.</li><li>Choose between <code>atomic.Int64</code> and a mutex. When would you need the mutex?</li></ul>`,
          solution: `// Buggy
type Stats struct{ requests int }
func (s *Stats) Inc() { s.requests++ } // racy read-modify-write

// Fix 1: atomic (single independent value)
type Stats struct{ requests atomic.Int64 }
func (s *Stats) Inc()          { s.requests.Add(1) }
func (s *Stats) Requests() int64 { return s.requests.Load() }

// Fix 2: mutex (multiple fields that must stay consistent together)
type Stats struct {
    mu       sync.Mutex
    requests int64
    bytes    int64
}
func (s *Stats) Record(n int64) {
    s.mu.Lock()
    s.requests++
    s.bytes += n
    s.mu.Unlock()
}

// Test to catch it:
func TestStatsConcurrent(t *testing.T) {
    var s Stats
    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() { defer wg.Done(); s.Inc() }()
    }
    wg.Wait()
    if got := s.Requests(); got != 100 {
        t.Fatalf("got %d", got)
    }
}
// go test -race ./...`,
          lang: 'go'
        },
        {
          t: 'Make a map safe for concurrent use',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li>Concurrent writes to a Go map crash with <code>fatal error: concurrent map writes</code>.</li><li>Options: <code>sync.Mutex</code>/<code>RWMutex</code> wrapper, <code>sync.Map</code>, sharded maps.</li><li>When is <code>sync.Map</code> appropriate (per its docs)?</li></ul>`,
          solution: `// 1. Mutex wrapper -- the default choice.
type SafeMap[K comparable, V any] struct {
    mu sync.RWMutex
    m  map[K]V
}

func NewSafeMap[K comparable, V any]() *SafeMap[K, V] {
    return &SafeMap[K, V]{m: make(map[K]V)}
}

func (s *SafeMap[K, V]) Load(k K) (V, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    v, ok := s.m[k]
    return v, ok
}

// LoadOrStore avoids the check-then-act race of Load followed by Store.
func (s *SafeMap[K, V]) LoadOrStore(k K, v V) (V, bool) {
    s.mu.Lock()
    defer s.mu.Unlock()
    if cur, ok := s.m[k]; ok {
        return cur, true
    }
    s.m[k] = v
    return v, false
}

// 2. sync.Map: optimised for (a) keys written once and read many times
//    (caches that only grow) or (b) goroutines working on disjoint key sets.
//    Not type-safe and slower for general read/write mixes.
// 3. Sharded map: N maps each with its own mutex, shard = hash(k) % N,
//    to cut contention at high core counts.`,
          lang: 'go'
        },
        {
          t: 'Bound concurrency with a semaphore',
          d: 'easy',
          type: 'coding',
          hint: `<ul><li>Process 10,000 jobs but allow at most 16 in flight (e.g. DB connections).</li><li>Use a buffered channel or <code>x/sync/semaphore</code>; respect context cancellation.</li><li>Return the first error and stop launching new work.</li></ul>`,
          solution: `package jobs

import (
    "context"

    "golang.org/x/sync/semaphore"
)

// Job is any unit of work.
type Job interface {
    Run(ctx context.Context) error
}

func ProcessAll(ctx context.Context, jobs []Job, limit int64) error {
    sem := semaphore.NewWeighted(limit)
    errc := make(chan error, 1)
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()

    for _, j := range jobs {
        if err := sem.Acquire(ctx, 1); err != nil { // blocks while 'limit' jobs run
            break // ctx cancelled (by caller or first error)
        }
        go func() {
            defer sem.Release(1)
            if err := j.Run(ctx); err != nil {
                select {
                case errc <- err: // keep only the first error
                    cancel()
                default:
                }
            }
        }()
    }
    // Wait for all in-flight jobs by acquiring every permit.
    _ = sem.Acquire(context.Background(), limit)
    select {
    case err := <-errc:
        return err
    default:
        return ctx.Err()
    }
}

// Simpler idiomatic alternative:
//   g, ctx := errgroup.WithContext(ctx)
//   g.SetLimit(16)
//   for _, j := range jobs { g.Go(func() error { return j.Run(ctx) }) }
//   return g.Wait()`,
          lang: 'go'
        },
        {
          t: 'Implement a bounded blocking queue with mutex + condition variables',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Ring buffer of fixed capacity; two condition variables: <code>notFull</code> and <code>notEmpty</code> sharing one mutex.</li><li><code>Put</code> waits while full; <code>Take</code> waits while empty — always in a <code>for</code> loop.</li><li>Support <code>Close</code>: wake everyone with <code>Broadcast</code>; Take drains remaining items then reports closed.</li><li>Then compare with <code>make(chan T, n)</code>.</li></ul>`,
          solution: `package queue

import (
    "errors"
    "sync"
)

var ErrClosed = errors.New("queue closed")

type Bounded[T any] struct {
    mu       sync.Mutex
    notEmpty *sync.Cond
    notFull  *sync.Cond
    buf      []T
    head     int
    count    int
    closed   bool
}

func New[T any](capacity int) *Bounded[T] {
    q := &Bounded[T]{buf: make([]T, capacity)}
    q.notEmpty = sync.NewCond(&q.mu)
    q.notFull = sync.NewCond(&q.mu)
    return q
}

func (q *Bounded[T]) Put(v T) error {
    q.mu.Lock()
    defer q.mu.Unlock()
    for q.count == len(q.buf) && !q.closed { // loop: spurious wakeups / stolen slot
        q.notFull.Wait() // atomically unlocks mu and sleeps; relocks on wake
    }
    if q.closed {
        return ErrClosed
    }
    q.buf[(q.head+q.count)%len(q.buf)] = v
    q.count++
    q.notEmpty.Signal() // one item -> one consumer
    return nil
}

func (q *Bounded[T]) Take() (T, bool) {
    q.mu.Lock()
    defer q.mu.Unlock()
    for q.count == 0 && !q.closed {
        q.notEmpty.Wait()
    }
    var zero T
    if q.count == 0 { // closed and drained
        return zero, false
    }
    v := q.buf[q.head]
    q.buf[q.head] = zero // drop reference for the GC
    q.head = (q.head + 1) % len(q.buf)
    q.count--
    q.notFull.Signal()
    return v, true
}

func (q *Bounded[T]) Close() {
    q.mu.Lock()
    q.closed = true
    q.mu.Unlock()
    q.notEmpty.Broadcast() // every waiter must re-check the predicate
    q.notFull.Broadcast()
}

// Idiomatic Go: ch := make(chan T, capacity) is exactly a bounded blocking
// queue, and also works with select, timeouts and context cancellation --
// which sync.Cond.Wait cannot.`,
          lang: 'go'
        },
        {
          t: 'Fix the bank-transfer deadlock',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li><code>transfer(a, b)</code> locks <code>a</code> then <code>b</code>; concurrently <code>transfer(b, a)</code> locks <code>b</code> then <code>a</code>.</li><li>Which Coffman condition is easiest to break?</li><li>Handle <code>from == to</code>.</li></ul>`,
          solution: `type Account struct {
    ID      int64
    mu      sync.Mutex
    balance int64
}

var ErrInsufficient = errors.New("insufficient funds")

// Deadlock-free: impose a global lock order by account ID (breaks circular wait).
func Transfer(from, to *Account, amount int64) error {
    if from == to {
        return nil
    }
    first, second := from, to
    if to.ID < from.ID {
        first, second = to, from
    }
    first.mu.Lock()
    defer first.mu.Unlock()
    second.mu.Lock()
    defer second.mu.Unlock()

    if from.balance < amount { // check-then-act is safe: both locks held
        return ErrInsufficient
    }
    from.balance -= amount
    to.balance += amount
    return nil
}

// Other options: one global lock (simple, serialises everything),
// TryLock + back off with jitter (breaks hold-and-wait, risks livelock),
// or a single goroutine owning all balances (no locks at all).
// Databases solve the same problem with lock ordering + deadlock detection
// (one transaction is aborted and must be retried).`,
          lang: 'go'
        },
        {
          t: 'Solve dining philosophers without deadlock',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Naive: everyone picks up the left fork then the right → circular wait.</li><li>Resource ordering: always pick up the lower-numbered fork first.</li><li>Alternatives: a "waiter" semaphore that admits at most N−1 philosophers, or an asymmetric solution.</li><li>Does your solution prevent starvation too?</li></ul>`,
          solution: `package main

import (
    "fmt"
    "sync"
    "time"
)

const n = 5

func philosopher(id int, forks []sync.Mutex, meals int, wg *sync.WaitGroup) {
    defer wg.Done()
    left, right := id, (id+1)%n
    // Resource ordering: lower index first. Philosopher 4 takes fork 0 before
    // fork 4, so a cycle of "holding left, waiting for right" is impossible.
    first, second := min(left, right), max(left, right)
    for m := 0; m < meals; m++ {
        time.Sleep(time.Millisecond) // think
        forks[first].Lock()
        forks[second].Lock()
        fmt.Printf("philosopher %d eating (meal %d)\\n", id, m+1)
        time.Sleep(time.Millisecond) // eat
        forks[second].Unlock()
        forks[first].Unlock()
    }
}

func main() {
    forks := make([]sync.Mutex, n)
    var wg sync.WaitGroup
    for i := 0; i < n; i++ {
        wg.Add(1)
        go philosopher(i, forks, 3, &wg)
    }
    wg.Wait()
}

// Alternative ("waiter"): a semaphore of size n-1 around picking up forks;
// with at most 4 at the table, at least one can always get both forks.
//   waiter := make(chan struct{}, n-1)
//   waiter <- struct{}{}; lock left; lock right; eat; unlock; <-waiter
// Starvation: ordering prevents deadlock but not starvation in theory;
// Go's mutex starvation mode (FIFO handoff after 1 ms) makes it unlikely.`,
          lang: 'go'
        },
        {
          t: 'Run the banker\'s algorithm safety check',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>Available = (3,3,2). Allocation: P0 (0,1,0), P1 (2,0,0), P2 (3,0,2), P3 (2,1,1), P4 (0,0,2). Max: P0 (7,5,3), P1 (3,2,2), P2 (9,0,2), P3 (2,2,2), P4 (4,3,3).</li><li>Need = Max − Allocation. Find a sequence in which every process can finish.</li><li>Then: can P1's request (1,0,2) be granted? Can P0's request (0,2,0) then be granted?</li></ul>`,
          solution: `Need: P0 (7,4,3) P1 (1,2,2) P2 (6,0,0) P3 (0,1,1) P4 (4,3,1)

Safety (Work = Available = 3,3,2):
  P1 need 1,2,2 <= 3,3,2 -> finish, Work = 5,3,2
  P3 need 0,1,1 <= 5,3,2 -> Work = 7,4,3
  P4 need 4,3,1 <= 7,4,3 -> Work = 7,4,5
  P0 need 7,4,3 <= 7,4,5 -> Work = 7,5,5
  P2 need 6,0,0 <= 7,5,5 -> Work = 10,5,7
Safe sequence: <P1, P3, P4, P0, P2>

Request P1 (1,0,2): <= Need(1,2,2) and <= Available(3,3,2).
  Pretend: Available 2,3,0; P1 alloc 3,0,2; P1 need 0,2,0.
  Safety: P1 -> 5,3,2; P3 -> 7,4,3; P4 -> 7,4,5; P0 -> 7,5,5; P2 -> 10,5,7. Safe -> GRANT.

Then P0 requests (0,2,0): Available would be 2,1,0.
  No process's Need fits in 2,1,0 (P1 needs 0,2,0; P3 needs 0,1,1 ...) -> unsafe -> DENY (P0 waits).

func leq(a, b []int) bool { // a[i] <= b[i] for every resource type
    for i := range a {
        if a[i] > b[i] {
            return false
        }
    }
    return true
}

func safe(avail []int, alloc, need [][]int) bool {
    work := append([]int(nil), avail...)
    done := make([]bool, len(alloc))
    for progress := true; progress; {
        progress = false
        for p := range alloc {
            if done[p] || !leq(need[p], work) {
                continue
            }
            for r := range work {
                work[r] += alloc[p][r]
            }
            done[p], progress = true, true
        }
    }
    for _, d := range done {
        if !d {
            return false
        }
    }
    return true
}

Why it's rare in practice: processes must declare maximum needs up front.
Real systems prefer prevention (lock ordering) or detection + abort (DBs).`,
          lang: 'text'
        },
        {
          t: 'Implement a lock-free stack with CAS and explain ABA',
          d: 'hard',
          type: 'coding',
          hint: `<ul><li>Treiber stack: <code>head atomic.Pointer[node]</code>; Push and Pop are CAS retry loops.</li><li>Walk through the ABA interleaving for Pop in a language with manual memory reuse.</li><li>Why does Go's GC prevent this particular ABA? When could it still happen?</li></ul>`,
          solution: `package lockfree

import "sync/atomic"

type node[T any] struct {
    val  T
    next *node[T]
}

type Stack[T any] struct {
    head atomic.Pointer[node[T]]
}

func (s *Stack[T]) Push(v T) {
    n := &node[T]{val: v}
    for {
        old := s.head.Load()
        n.next = old
        if s.head.CompareAndSwap(old, n) {
            return
        }
    }
}

func (s *Stack[T]) Pop() (T, bool) {
    for {
        old := s.head.Load()
        if old == nil {
            var zero T
            return zero, false
        }
        if s.head.CompareAndSwap(old, old.next) {
            return old.val, true
        }
    }
}

/*
ABA (C/C++ with free + reuse):
  Stack: A -> B -> C
  T1 Pop: old = A, next = B ... preempted before CAS
  T2 Pop A, Pop B (B freed), Push A again (or a new node allocated at A's
     address).  Stack: A -> C
  T1 resumes: CAS(head, A, B) SUCCEEDS (head is A) -> head = B, a freed node.
  Fixes: tagged pointer (pointer + version counter, double-width CAS),
  hazard pointers, epoch-based reclamation (RCU-like).

Go: T1 still references A, so the GC cannot free/reuse A or B while T1 holds
'old' -- the classic memory-reuse ABA cannot happen. It CAN still happen if
nodes are recycled via sync.Pool / free lists, or with index-based arrays.

Performance note: under heavy contention every CAS bounces the head cache
line; a mutex-protected slice is often just as fast. Benchmark before use.
*/`,
          lang: 'go'
        },
        {
          t: 'Debug a publication bug that only fails on ARM (Graviton)',
          d: 'hard',
          type: 'debug',
          hint: `<ul><li>A config loader writes fields of a struct then sets a plain <code>bool loaded = true</code>; readers spin or check the flag.</li><li>Works on x86 laptops, intermittently returns zero values on ARM64 servers. Why does x86 hide it?</li><li>Run the race detector; fix with the Go memory model's happens-before primitives.</li></ul>`,
          solution: `Buggy code:
    var cfg Config
    var loaded bool
    func load()  { cfg = readConfig(); loaded = true }       // goroutine A
    func get() *Config { if loaded { return &cfg }; return nil } // goroutines B..

Why it fails:
- It's a data race, so Go gives no ordering guarantee.
- Compiler: may reorder or cache 'loaded' in a register.
- CPU: x86 (TSO) never reorders store->store or load->load, so the writes to
  cfg become visible before 'loaded' and the bug hides. ARM64 is weakly
  ordered: the 'loaded' store may become visible before the cfg stores, or
  the reader's cfg loads may be satisfied before its 'loaded' load.
- go test -race flags it immediately on any architecture.

Fixes (all create happens-before):
1. atomic.Pointer publication (best for config reloads):
       var cfgPtr atomic.Pointer[Config]
       func load()          { c := readConfig(); cfgPtr.Store(&c) }
       func get() *Config   { return cfgPtr.Load() }
2. sync.Once / sync.OnceValue for one-time init:
       var getCfg = sync.OnceValue(readConfig)
3. Mutex around both write and read, or a channel close as the signal.

Lesson: "works on my machine" is meaningless for racy code; run -race in CI
and test on the target architecture.`,
          lang: 'text'
        },
        {
          t: 'Implement a writer-preferring readers-writer lock',
          d: 'hard',
          type: 'coding',
          hint: `<ul><li>State: active readers count, writer active flag, waiting writers count, guarded by a mutex + condition variable.</li><li>Readers wait while a writer is active <em>or waiting</em> (writer preference prevents writer starvation).</li><li>Writers wait while a writer is active or readers are active.</li><li>What starvation risk does writer preference introduce?</li></ul>`,
          solution: `package rw

import "sync"

type RWLock struct {
    mu             sync.Mutex
    cond           *sync.Cond
    readers        int  // active readers
    writer         bool // a writer holds the lock
    waitingWriters int
}

func New() *RWLock {
    l := &RWLock{}
    l.cond = sync.NewCond(&l.mu)
    return l
}

func (l *RWLock) RLock() {
    l.mu.Lock()
    for l.writer || l.waitingWriters > 0 { // yield to waiting writers
        l.cond.Wait()
    }
    l.readers++
    l.mu.Unlock()
}

func (l *RWLock) RUnlock() {
    l.mu.Lock()
    l.readers--
    if l.readers == 0 {
        l.cond.Broadcast() // a waiting writer may proceed
    }
    l.mu.Unlock()
}

func (l *RWLock) Lock() {
    l.mu.Lock()
    l.waitingWriters++
    for l.writer || l.readers > 0 {
        l.cond.Wait()
    }
    l.waitingWriters--
    l.writer = true
    l.mu.Unlock()
}

func (l *RWLock) Unlock() {
    l.mu.Lock()
    l.writer = false
    l.cond.Broadcast() // wake readers and writers; they re-check predicates
    l.mu.Unlock()
}

// Reader preference (first readers-writers problem) starves writers under
// constant reads; writer preference (this one) can starve readers under
// constant writes. Fair variants queue requests in arrival order (phase-fair
// or ticket-based). Go's sync.RWMutex is writer-preferring in the same sense:
// a pending Lock blocks new RLocks.`,
          lang: 'go'
        },
        {
          t: 'Solve producer-consumer with counting semaphores',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Classic solution: three semaphores. <code>empty</code> starts at N (free slots), <code>full</code> starts at 0 (filled slots), and a mutex protects the buffer indexes.</li><li>Producer: P(empty), lock, insert, unlock, V(full). Consumer: P(full), lock, remove, unlock, V(empty).</li><li>What happens if a producer locks the mutex <em>before</em> P(empty)?</li><li>Build the semaphore yourself from a mutex and a condition variable to show you understand P and V.</li></ul>`,
          solution: `package pc

import "sync"

// Semaphore: P (acquire) blocks while the count is 0; V (release) increments
// and wakes one waiter.
type Semaphore struct {
    mu    sync.Mutex
    cond  *sync.Cond
    count int
}

func NewSemaphore(n int) *Semaphore {
    s := &Semaphore{count: n}
    s.cond = sync.NewCond(&s.mu)
    return s
}

func (s *Semaphore) P() {
    s.mu.Lock()
    for s.count == 0 {
        s.cond.Wait()
    }
    s.count--
    s.mu.Unlock()
}

func (s *Semaphore) V() {
    s.mu.Lock()
    s.count++
    s.mu.Unlock()
    s.cond.Signal()
}

type Buffer[T any] struct {
    empty, full *Semaphore // free slots, filled slots
    mu          sync.Mutex // protects buf, in, out
    buf         []T
    in, out     int
}

func NewBuffer[T any](n int) *Buffer[T] {
    return &Buffer[T]{empty: NewSemaphore(n), full: NewSemaphore(0), buf: make([]T, n)}
}

func (b *Buffer[T]) Put(v T) {
    b.empty.P() // wait for a free slot FIRST, without holding the mutex
    b.mu.Lock()
    b.buf[b.in] = v
    b.in = (b.in + 1) % len(b.buf)
    b.mu.Unlock()
    b.full.V()
}

func (b *Buffer[T]) Take() T {
    b.full.P()
    b.mu.Lock()
    v := b.buf[b.out]
    b.out = (b.out + 1) % len(b.buf)
    b.mu.Unlock()
    b.empty.V()
    return v
}

// Why the order matters: if Put took b.mu and THEN waited on empty while the
// buffer was full, consumers could never get b.mu to remove an item -> deadlock
// (hold-and-wait + circular wait). Always acquire the counting semaphore
// before the mutex, and release the mutex before signalling.
//
// In Go the whole structure is just make(chan T, n): the channel's buffer is
// the ring, and send/receive block exactly like P(empty)/P(full).`,
          lang: 'go'
        }
      ],
      interviewFocus: [
        {
          q: 'Mutex vs spinlock vs semaphore vs condition variable vs channel: when do you use each?',
          a: `<table><thead><tr><th>Primitive</th><th>Purpose</th><th>Use when</th></tr></thead><tbody>
<tr><td>Mutex</td><td>Mutual exclusion with ownership</td><td>Protecting shared state; default choice for invariants spanning several fields</td></tr>
<tr><td>Spinlock</td><td>Mutual exclusion by busy-waiting</td><td>Kernel/very short sections where the holder can't be preempted; almost never in Go application code</td></tr>
<tr><td>RW lock</td><td>Shared readers, exclusive writer</td><td>Read-heavy data with non-trivial read sections (measure vs Mutex)</td></tr>
<tr><td>Semaphore</td><td>Count of permits</td><td>Limiting concurrency (pools, parallel calls)</td></tr>
<tr><td>Condition variable</td><td>Wait for a predicate over locked state</td><td>Monitors with complex state, broadcast wake-ups</td></tr>
<tr><td>Atomic</td><td>Single-word lock-free update</td><td>Counters, flags, pointer swaps of immutable snapshots</td></tr>
<tr><td>Channel</td><td>Transfer ownership of data, signal events</td><td>Pipelines, worker pools, cancellation, timeouts with <code>select</code></td></tr>
</tbody></table>
<p>Go proverb: "share memory by communicating" — but channels are not a mutex replacement for protecting a map. Rule of thumb: <strong>channels for passing ownership/coordination, mutexes for guarding state</strong>.</p>`
        },
        {
          q: 'What are the Coffman conditions, and how do you prevent deadlocks in real systems?',
          a: `<p>Deadlock requires all four: <strong>mutual exclusion</strong>, <strong>hold and wait</strong>, <strong>no preemption</strong>, <strong>circular wait</strong>. Remove any one and deadlock is impossible.</p>
<ul><li><strong>Circular wait</strong> → global lock ordering (by ID, by address, by lock hierarchy level). The most practical technique.</li>
<li><strong>Hold and wait</strong> → acquire everything up front, or <code>TryLock</code> and release all on failure (add jittered backoff to avoid livelock).</li>
<li><strong>No preemption</strong> → timeouts/cancellation (context deadlines on lock-like waits, DB lock timeouts) that force a release.</li>
<li><strong>Mutual exclusion</strong> → immutable data, lock-free or single-owner designs (one goroutine owns the state).</li></ul>
<p><strong>Avoidance</strong> (banker's algorithm) requires knowing max claims — rare. <strong>Detection</strong> is what databases do: build a wait-for graph, find a cycle, abort a victim transaction (clients must retry). Distributed systems use lease/lock timeouts.</p>
<p>In Go: avoid calling external code while holding a lock, never hold a lock while sending on an unbuffered channel, use goroutine dumps to diagnose hangs, and remember the runtime only detects a <em>global</em> deadlock.</p>`
        },
        {
          q: 'Explain compare-and-swap and the ABA problem. Does Go suffer from ABA?',
          a: `<p><strong>CAS(addr, expected, new)</strong> atomically writes <code>new</code> only if the current value equals <code>expected</code>. Lock-free algorithms read a value, compute a new one, and CAS; failure means someone else changed it, so retry.</p>
<p><strong>ABA</strong>: CAS only compares values, not history. A thread reads A, gets delayed; others change A→B→A (e.g. pop A, pop B, push a node that reuses A's memory). The CAS succeeds although the structure changed — e.g. in a lock-free stack, head becomes a stale <code>next</code> pointer to freed memory.</p>
<p><strong>Solutions</strong>: version counters alongside the pointer (tagged pointers / double-width CAS), hazard pointers (announce what you're reading so it isn't freed), epoch-based reclamation / RCU, or garbage collection.</p>
<p><strong>Go</strong>: because the GC won't reclaim a node while any goroutine holds a pointer to it, the classic pointer-reuse ABA can't occur with freshly allocated nodes. It can still occur if you recycle nodes (sync.Pool, free lists), use indices into arrays, or CAS on integer states where A→B→A is semantically meaningful.</p>`
        },
        {
          q: 'What is memory reordering, and how does Go\'s memory model protect you?',
          a: `<p>Compilers reorder and cache memory accesses; CPUs execute out of order and buffer stores. x86 (TSO) only lets a later load pass an earlier store; ARM64 allows almost any reordering. So a thread can observe another thread's writes in a different order than they were issued.</p>
<p>Go's memory model: if a program has <strong>no data races</strong>, it behaves sequentially consistently (DRF-SC). Ordering is established by <strong>happens-before</strong> edges created by synchronization:</p>
<ul><li>A send on a channel happens before the corresponding receive completes; closing happens before a receive that returns because of the close.</li>
<li>For an unbuffered channel, the receive happens before the send completes.</li>
<li><code>Unlock</code> happens before a subsequent <code>Lock</code> returns.</li>
<li><code>sync.Once</code> function completes before any <code>Do</code> returns.</li>
<li><code>sync/atomic</code> operations are sequentially consistent: if B observes A's atomic write, A happens before B.</li></ul>
<p>So you never need explicit fences in Go; you need to make every cross-goroutine communication go through one of these primitives — and prove it with <code>-race</code>.</p>`
        },
        {
          q: 'Implement producer-consumer correctly. What are the pitfalls?',
          a: `<p>Producer-consumer is a bounded buffer shared by producers and consumers:</p>
<ul><li>Producers must block (or shed load) when the buffer is full — this is <strong>backpressure</strong>.</li>
<li>Consumers must block when empty without busy-waiting.</li>
<li>Shutdown must let consumers drain and exit, and must not panic producers.</li></ul>
<p><strong>In Go</strong>: a buffered channel is a bounded queue. Producers <code>select</code> on send and <code>ctx.Done()</code>; the <em>single owner</em> (or a coordinator after a <code>WaitGroup</code>) closes the channel; consumers <code>for v := range ch</code>.</p>
<p><strong>With mutex + condvars</strong>: two conditions (<code>notFull</code>, <code>notEmpty</code>), wait in <code>for</code> loops, signal the opposite condition after each change, broadcast on close.</p>
<p>Pitfalls: <code>if</code> instead of <code>for</code> around Wait (spurious wakeups / stolen items); sending on a closed channel (panic) when multiple producers close; unbounded queues hiding overload until OOM; forgetting cancellation so goroutines leak; doing slow work while holding the lock; one slow consumer blocking everything (use per-consumer queues or more workers).</p>`
        }
      ],
      quiz: [
        { q: 'What is the difference between a data race and a race condition?', a: 'A data race is unsynchronized concurrent access to the same memory with at least one write; a race condition is any bug where the outcome depends on timing, which can happen even without data races.' },
        { q: 'Why must sync.Cond.Wait be called in a for loop?', a: 'Because wakeups can be spurious and another goroutine may change the state between the signal and reacquiring the lock, so the predicate must be rechecked.' },
        { q: 'Name the four Coffman conditions.', a: 'Mutual exclusion, hold and wait, no preemption, circular wait.' },
        { q: 'What is priority inversion and its standard fix?', a: 'A high-priority task waits on a lock held by a low-priority task that is preempted by a medium-priority task; fixed by priority inheritance (or priority ceiling).' },
        { q: 'What does Go\'s sync.Mutex starvation mode do?', a: 'After a waiter has waited more than 1 ms, the mutex hands ownership directly to waiters in FIFO order instead of letting new arrivals barge in.' },
        { q: 'What memory ordering do Go\'s sync/atomic operations provide?', a: 'Sequential consistency: they behave like C++ seq_cst atomics and create happens-before edges.' },
        { q: 'Lock-free vs wait-free?', a: 'Lock-free guarantees some thread makes progress; wait-free guarantees every thread finishes in a bounded number of steps.' },
        { q: 'Why can recursive RLock deadlock with sync.RWMutex?', a: 'If a writer calls Lock between the two RLocks, the second RLock blocks behind the waiting writer, which waits for the first RLock to be released.' },
        { q: 'In the semaphore producer-consumer solution, why must a producer wait on empty before locking the buffer mutex?', a: 'If it held the mutex while blocked on a full buffer, consumers could never take the mutex to free a slot, so everyone would deadlock.' }
      ],
      resources: [
        { title: 'The Go Memory Model', url: 'https://go.dev/ref/mem', type: 'docs' },
        { title: 'Go Data Race Detector', url: 'https://go.dev/doc/articles/race_detector', type: 'docs' },
        { title: 'OSTEP — Locks', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf', type: 'book' },
        { title: 'OSTEP — Common Concurrency Problems (deadlock)', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf', type: 'book' }
      ]
    },
    // ───────────────────────────── Module 7 ─────────────────────────────
    {
      n: 7,
      title: 'I/O, Files & Linux Internals',
      summary: 'How data moves between devices, the kernel and your process: interrupts and DMA, I/O models and multiplexing (select/poll/epoll/kqueue/io_uring), file descriptors, the page cache and fsync, zero-copy, Go\'s netpoller, and the namespaces and cgroups that make containers.',
      topics: [
        {
          title: 'I/O Devices, Interrupts, DMA & Polling',
          def: `<p>Devices (NICs, NVMe SSDs, GPUs) sit behind <strong>controllers</strong> exposing registers that the CPU accesses via <strong>memory-mapped I/O</strong> (or legacy port I/O). Three ways to move data and learn about completion:</p>
<table><thead><tr><th>Technique</th><th>How</th><th>Trade-off</th></tr></thead><tbody>
<tr><td><strong>Programmed I/O + polling</strong></td><td>CPU repeatedly checks a status register and copies data itself</td><td>Lowest latency, burns CPU; used by DPDK/SPDK busy-polling</td></tr>
<tr><td><strong>Interrupts</strong></td><td>Device raises an IRQ when ready; CPU runs a handler</td><td>CPU free between events; each interrupt costs ~µs, storms at high rates</td></tr>
<tr><td><strong>DMA</strong></td><td>Device reads/writes RAM directly using descriptor rings set up by the driver, then interrupts on completion</td><td>CPU not involved in copying; standard for NICs and NVMe</td></tr>
</tbody></table>
<p>Linux splits interrupt handling into a fast <strong>top half</strong> (acknowledge, schedule work) and deferred <strong>bottom halves</strong> (softirqs, tasklets, threaded IRQs). Under high packet rates, the network stack uses <strong>NAPI</strong>: after the first interrupt, it disables further interrupts and polls the ring until empty — a hybrid of interrupts and polling. NICs also <strong>coalesce</strong> interrupts (trade latency for throughput).</p>
<p>Modern devices are <strong>multi-queue</strong>: an NVMe SSD has up to 64K submission/completion queue pairs (typically one per CPU); NICs use RSS (receive-side scaling) to hash flows to per-CPU queues, each with its own IRQ. If all IRQs land on one core, that core's <code>si</code> (softirq) time saturates and throughput plateaus — check <code>/proc/interrupts</code> and IRQ affinity / <code>irqbalance</code>.</p>
<p>Backend relevance: high <code>si</code>/<code>hi</code> CPU in <code>top</code> means time in interrupt/softirq handling (packet processing), not your code. Interrupts also preempt your threads, contributing to tail latency.</p>`,
          interview: 'Contrast polling, interrupts and DMA with their trade-offs, explain top/bottom halves and NAPI as the interrupt/polling hybrid, and mention multi-queue NICs/NVMe with per-CPU queues. A practical touch: diagnosing a single core pegged in softirq via /proc/interrupts.',
          examples: [
            {
              label: 'Inspect interrupts and softirq load',
              lang: 'bash',
              code: `$ grep -E 'CPU|eth0|nvme0q1' /proc/interrupts | cut -c1-90
            CPU0       CPU1       CPU2       CPU3
 45:   88123412          0          0          0   PCI-MSI  eth0-TxRx-0
 46:          0   87991022          0          0   PCI-MSI  eth0-TxRx-1
 47:          0          0   88410233          0   PCI-MSI  eth0-TxRx-2
 48:          0          0          0   88203117   PCI-MSI  eth0-TxRx-3   # one queue per CPU: good
 61:    1203441          0          0          0   PCI-MSI  nvme0q1

$ mpstat -P ALL 1 1 | head -8
CPU    %usr   %sys  %iowait  %irq  %soft  %idle
all    22.1    9.8     0.2    0.0    6.1   61.8
  0    20.4    9.1     0.1    0.0   24.7   45.7    # CPU0 doing most softirq work?
  1    23.0   10.2     0.3    0.0    0.4   66.1`
            }
          ]
        },
        {
          title: 'I/O Models: Blocking, Non-Blocking, Multiplexed & Async (the C10K Problem)',
          def: `<table><thead><tr><th>Model</th><th>Behaviour</th><th>Example</th></tr></thead><tbody>
<tr><td><strong>Blocking</strong></td><td><code>read()</code> puts the thread to sleep until data arrives</td><td>Thread-per-connection servers</td></tr>
<tr><td><strong>Non-blocking</strong></td><td><code>read()</code> returns <code>EAGAIN</code> immediately if no data (<code>O_NONBLOCK</code>)</td><td>Building block for event loops</td></tr>
<tr><td><strong>I/O multiplexing</strong></td><td>One call waits for readiness on many fds (<code>select</code>/<code>poll</code>/<code>epoll</code>/<code>kqueue</code>), then do non-blocking I/O on the ready ones</td><td>nginx, Redis, Node.js, Go's netpoller</td></tr>
<tr><td><strong>Signal-driven</strong></td><td>Kernel sends SIGIO when ready</td><td>Rare</td></tr>
<tr><td><strong>Asynchronous (completion-based)</strong></td><td>Submit the operation; kernel performs it and notifies on <em>completion</em></td><td>io_uring, Windows IOCP, POSIX AIO</td></tr>
</tbody></table>
<p>Key distinction: multiplexing APIs report <strong>readiness</strong> ("you can read now without blocking"); async APIs report <strong>completion</strong> ("the read is done, data is in your buffer"). Readiness doesn't work for regular files — they're always "ready" even if the data must come from disk — which is why file I/O needs threads or io_uring.</p>
<p><strong>The C10K problem</strong> (Dan Kegel, 1999): how to serve 10,000 concurrent connections on one machine. Thread-per-connection hit limits: 10K threads × MB-sized stacks, scheduler overhead and context switches, and <code>select()</code>'s O(n) scans and 1024-fd limit. Solutions: event-driven architectures with scalable readiness APIs (epoll in Linux 2.5.44, kqueue in FreeBSD 4.1), non-blocking I/O and small per-connection state. Today the frontier is C10M (millions), using kernel bypass or io_uring.</p>
<p>Go's answer: write <em>blocking-style</em> code (one goroutine per connection, <code>conn.Read</code>), while the runtime implements it with non-blocking sockets and epoll underneath — the ergonomics of threads with the scalability of an event loop.</p>`,
          interview: 'Distinguish blocking, non-blocking, multiplexed (readiness) and async (completion) I/O, explain why readiness APIs do not help for regular files, and tell the C10K story: thread-per-connection costs vs event loops with epoll. Close with how Go hides the event loop behind goroutines.',
          examples: [
            {
              label: 'Readiness vs completion, schematically',
              lang: 'text',
              code: `Blocking:        read(fd) ............ sleeps ............> data
Non-blocking:    read(fd) -> EAGAIN; read(fd) -> EAGAIN; read(fd) -> data   (busy polling)
Multiplexed:     epoll_wait([fd1..fdN]) -> {fd7 readable}; read(fd7) -> data (no wait)
Async (io_uring): submit READ(fd, buf) ... do other work ... reap CQE: "read 4096 bytes into buf"

Thread-per-connection at 10k connections:
  10,000 threads x (8 MiB reserved stack, ~16 KiB kernel stack, task_struct)
  + scheduler run-queue churn + context switch per wake-up
Event loop / Go netpoller at 10k connections:
  ~GOMAXPROCS busy threads, 10,000 goroutines x ~4-8 KiB, one epoll set`
            }
          ]
        },
        {
          title: 'select, poll, epoll, kqueue & io_uring',
          def: `<table><thead><tr><th>API</th><th>Interest set</th><th>Cost per wait</th><th>Notes</th></tr></thead><tbody>
<tr><td><code>select</code></td><td>fd bitmaps passed every call</td><td>O(max fd) scan + copy both ways</td><td>FD_SETSIZE = 1024 limit; POSIX, everywhere</td></tr>
<tr><td><code>poll</code></td><td>Array of <code>pollfd</code> passed every call</td><td>O(n) scan + copy</td><td>No fd limit</td></tr>
<tr><td><code>epoll</code> (Linux)</td><td>Registered once in the kernel (<code>epoll_ctl</code>)</td><td>O(ready) — returns only ready fds</td><td>Level- or edge-triggered; <code>EPOLLONESHOT</code>, <code>EPOLLEXCLUSIVE</code></td></tr>
<tr><td><code>kqueue</code> (BSD/macOS)</td><td>Registered in the kernel; changes + wait in one call</td><td>O(ready)</td><td>Generic: fds, timers, signals, process events</td></tr>
<tr><td><code>io_uring</code> (Linux 5.1+)</td><td>Shared submission/completion rings</td><td>Batch many ops per syscall (or zero with SQPOLL)</td><td>Completion-based; files and sockets; often restricted by seccomp</td></tr>
</tbody></table>
<p><strong>epoll internals</strong>: <code>epoll_create1</code> makes an eventpoll object holding a <strong>red-black tree</strong> of registered fds and a <strong>ready list</strong>. <code>epoll_ctl(ADD)</code> inserts the fd and hooks a callback into the socket's wait queue. When a packet arrives, the network stack wakes the wait queue; the callback appends the item to the ready list and wakes any thread sleeping in <code>epoll_wait</code>, which copies out only ready items.</p>
<ul><li><strong>Level-triggered</strong> (default): reported on every <code>epoll_wait</code> while the fd remains readable. Forgiving.</li>
<li><strong>Edge-triggered</strong> (<code>EPOLLET</code>): reported only when the state <em>changes</em> (new data arrives). You must read/write until <code>EAGAIN</code>, or you may never be woken again for data already buffered. Fewer wake-ups; Go uses it.</li>
<li>Thundering herd on shared listening sockets: use <code>EPOLLEXCLUSIVE</code> or <code>SO_REUSEPORT</code> (per-thread listeners).</li></ul>
<p><strong>io_uring</strong>: the app writes submission queue entries (read, write, accept, send, fsync…) into a ring shared with the kernel and reaps completion entries from another ring — batching amortises syscalls and works for regular files. Features that matter for servers: registered (fixed) files and buffers, <em>multishot</em> accept/recv (one SQE keeps producing completions), linked operations, <code>SQPOLL</code> (a kernel thread polls the ring so steady-state I/O needs no syscalls), zero-copy send (6.0) and zero-copy receive (6.15).</p>
<p><strong>Status and security (2026)</strong>: io_uring has been one of the largest sources of Linux kernel privilege-escalation bugs; Google reported that ~60% of kernel exploits submitted to its bug bounty in 2022 targeted it, and restricts it on ChromeOS, Android and its production servers. Consequences you will meet:</p>
<ul><li>Docker's and containerd's default seccomp profiles (Kubernetes <code>RuntimeDefault</code>) block <code>io_uring_setup</code>/<code>io_uring_enter</code>/<code>io_uring_register</code>, so it usually fails with <code>EPERM</code>/<code>ENOSYS</code> inside containers unless explicitly allowed.</li>
<li>Since Linux 6.6 the sysctl <code>kernel.io_uring_disabled</code> (0 = on, 1 = only for <code>kernel.io_uring_group</code> members, 2 = off) lets hosts turn it off.</li>
<li>Operations submitted through the ring do not appear as individual syscalls, so seccomp filters and syscall-based security/EDR monitoring cannot see them (shown by 2025 "io_uring rootkit" proofs of concept).</li>
<li>Go's runtime does not use io_uring (the netpoller is epoll-based); libraries exist, but a portable service must fall back to epoll/threads when io_uring is unavailable.</li></ul>`,
          interview: 'Compare select/poll/epoll on interest-set handling and complexity, explain epoll\'s red-black tree + ready list + wait-queue callback, and the level vs edge-triggered contract (drain until EAGAIN). Knowing io_uring\'s submission/completion rings and why it is often disabled shows currency.',
          examples: [
            {
              label: 'Minimal level-triggered epoll echo server (Go + x/sys/unix)',
              lang: 'go',
              code: `//go:build linux

package main

import (
    "log"

    "golang.org/x/sys/unix"
)

func must(err error) {
    if err != nil {
        log.Fatal(err)
    }
}

func main() {
    lfd, err := unix.Socket(unix.AF_INET, unix.SOCK_STREAM|unix.SOCK_NONBLOCK|unix.SOCK_CLOEXEC, 0)
    must(err)
    must(unix.SetsockoptInt(lfd, unix.SOL_SOCKET, unix.SO_REUSEADDR, 1))
    must(unix.Bind(lfd, &unix.SockaddrInet4{Port: 9000}))
    must(unix.Listen(lfd, 1024))

    epfd, err := unix.EpollCreate1(unix.EPOLL_CLOEXEC)
    must(err)
    must(unix.EpollCtl(epfd, unix.EPOLL_CTL_ADD, lfd, &unix.EpollEvent{Events: unix.EPOLLIN, Fd: int32(lfd)}))

    events := make([]unix.EpollEvent, 128)
    buf := make([]byte, 4096)
    for {
        n, err := unix.EpollWait(epfd, events, -1) // sleeps until >= 1 fd is ready
        if err == unix.EINTR {
            continue
        }
        must(err)
        for i := 0; i < n; i++ {
            fd := int(events[i].Fd)
            if fd == lfd { // new connections: accept until EAGAIN
                for {
                    cfd, _, err := unix.Accept4(lfd, unix.SOCK_NONBLOCK|unix.SOCK_CLOEXEC)
                    if err != nil {
                        break // EAGAIN: backlog drained
                    }
                    _ = unix.EpollCtl(epfd, unix.EPOLL_CTL_ADD, cfd,
                        &unix.EpollEvent{Events: unix.EPOLLIN | unix.EPOLLRDHUP, Fd: int32(cfd)})
                }
                continue
            }
            r, err := unix.Read(fd, buf) // level-triggered: leftover data is reported again
            if err == unix.EAGAIN {
                continue
            }
            if err != nil || r == 0 { // error or peer closed
                unix.Close(fd) // also removes it from the epoll set (if not dup'ed)
                continue
            }
            _, _ = unix.Write(fd, buf[:r]) // real code: buffer short writes, wait for EPOLLOUT
        }
    }
}`
            }
          ]
        },
        {
          title: 'File Descriptors, the Page Cache, fsync & Zero-Copy',
          def: `<p>A <strong>file descriptor</strong> is an index into the process's fd table, pointing to an <em>open file description</em> (offset, flags, reference to the inode/socket). Sockets, pipes, epoll instances, timers and eventfds are all fds. Limits: per process <code>RLIMIT_NOFILE</code> (<code>ulimit -n</code>, soft default often 1024; Go 1.19+ raises the soft limit to the hard limit automatically), and system-wide <code>fs.file-max</code>. "Too many open files" (<code>EMFILE</code>) usually means a leak: unclosed HTTP response bodies, files, or connections stuck in CLOSE_WAIT.</p>
<p><strong>Page cache</strong>: <code>read()</code> copies from cached pages (filling them from disk on a miss); <code>write()</code> copies into the page cache, marks pages <strong>dirty</strong> and returns — the data is <em>not</em> on disk yet. Kernel flusher threads write back dirty pages after ~30 s (<code>dirty_expire_centisecs</code>) or when dirty memory exceeds <code>dirty_background_ratio</code>; above <code>dirty_ratio</code>, writers are throttled (latency spikes).</p>
<table><thead><tr><th>Call</th><th>Guarantee</th></tr></thead><tbody>
<tr><td><code>write()</code></td><td>In page cache; lost on power failure/crash of the kernel</td></tr>
<tr><td><code>fdatasync()</code></td><td>File data + metadata needed to read it (size) on stable storage</td></tr>
<tr><td><code>fsync()</code> (Go <code>f.Sync()</code>)</td><td>Data + all metadata durable; also flushes the drive's volatile cache</td></tr>
<tr><td>fsync on the directory</td><td>Makes a create/rename durable</td></tr>
<tr><td><code>O_DIRECT</code></td><td>Bypasses the page cache (DBs with their own cache); aligned buffers required</td></tr>
</tbody></table>
<p>If <code>fsync</code> fails, dirty pages may already be marked clean — retrying can falsely succeed (PostgreSQL's 2018 "fsyncgate"). Treat it as fatal for the file.</p>
<p><strong>Zero-copy</strong>: serving a file via <code>read()</code> + <code>write()</code> copies data disk→page cache (DMA) → user buffer (CPU) → socket buffer (CPU) → NIC (DMA), with two syscalls. <code>sendfile()</code> sends straight from the page cache to the socket (with scatter-gather NICs, no CPU copy at all); <code>splice()</code> moves data between fds via a pipe without user-space copies. Kafka serves consumers with sendfile; nginx has <code>sendfile on</code>. TLS breaks it unless the kernel does encryption (kTLS). In Go, <code>io.Copy(tcpConn, file)</code> uses sendfile and <code>io.Copy(tcpConn, tcpConn)</code> uses splice on Linux automatically.</p>`,
          interview: 'Explain fd tables and limits (and EMFILE leaks), that write() only reaches the page cache, the fsync/fdatasync/directory-fsync rules for durability, and the fsyncgate lesson. For zero-copy, count the copies in read+write vs sendfile and mention Go\'s automatic sendfile/splice in io.Copy and why TLS defeats it without kTLS.',
          examples: [
            {
              label: 'Durable, atomic file replacement in Go',
              lang: 'go',
              code: `// WriteFileAtomic replaces path so readers see either the old or the new
// content (never partial), and the new content survives a crash once it returns.
func WriteFileAtomic(path string, data []byte, perm os.FileMode) error {
    dir := filepath.Dir(path)
    tmp, err := os.CreateTemp(dir, ".tmp-*") // same filesystem, so rename is atomic
    if err != nil {
        return err
    }
    defer os.Remove(tmp.Name()) // no-op after successful rename

    if _, err := tmp.Write(data); err != nil {
        tmp.Close()
        return err
    }
    if err := tmp.Chmod(perm); err != nil {
        tmp.Close()
        return err
    }
    if err := tmp.Sync(); err != nil { // fsync: data on stable storage
        tmp.Close()
        return err
    }
    if err := tmp.Close(); err != nil {
        return err
    }
    if err := os.Rename(tmp.Name(), path); err != nil { // atomic swap of the name
        return err
    }
    d, err := os.Open(dir)
    if err != nil {
        return err
    }
    defer d.Close()
    return d.Sync() // fsync the directory: makes the rename itself durable
}`
            }
          ]
        },
        {
          title: 'How Go\'s Netpoller Uses epoll',
          def: `<p>Go lets you write simple blocking code — <code>n, err := conn.Read(buf)</code> in one goroutine per connection — while the runtime runs an event loop underneath:</p>
<ol><li><strong>Setup</strong>: every socket created by <code>net</code> (<code>Listen</code>, <code>Accept</code>, <code>Dial</code>) is put in non-blocking mode and registered <em>once</em> with a process-wide epoll instance (kqueue on BSD/macOS, IOCP on Windows) for <code>EPOLLIN|EPOLLOUT|EPOLLRDHUP|EPOLLET</code> — edge-triggered, so no re-arming is needed.</li>
<li><strong>Read</strong>: <code>conn.Read</code> calls <code>read(2)</code> directly. If data is buffered it returns immediately. If it gets <code>EAGAIN</code>, the goroutine is <strong>parked</strong> (<code>gopark</code>), its pointer stored in the fd's <code>pollDesc</code>; the M continues running other goroutines.</li>
<li><strong>Readiness</strong>: the scheduler calls <code>netpoll</code> — non-blocking when looking for work, blocking in <code>epoll_wait</code> when an M has nothing else to do, and <code>sysmon</code> polls if nobody has for ~10 ms. Ready fds map back to their pollDesc, and the parked goroutines are made runnable.</li>
<li><strong>Retry</strong>: the woken goroutine retries <code>read(2)</code>, which now succeeds.</li></ol>
<p><strong>Deadlines</strong> (<code>SetReadDeadline</code>, which <code>http.Server</code> timeouts use) are runtime timers attached to the pollDesc; when one fires, the parked goroutine wakes with <code>os.ErrDeadlineExceeded</code>.</p>
<table><thead><tr><th>Operation</th><th>Mechanism</th><th>Thread blocked?</th></tr></thead><tbody>
<tr><td>TCP/UDP/Unix sockets, pipes</td><td>Netpoller</td><td>No — only the goroutine parks</td></tr>
<tr><td>Regular file read/write</td><td>Blocking syscall + P handoff</td><td>Yes (an M per concurrent call)</td></tr>
<tr><td>cgo call (e.g. some DNS resolvers, SQLite via cgo)</td><td>Blocking, P handoff</td><td>Yes</td></tr>
<tr><td>time.Sleep, timers, channels</td><td>Runtime timers/queues</td><td>No</td></tr>
</tbody></table>
<p>Result: 100K idle keep-alive connections cost ~100K small goroutine stacks plus socket buffers, and only about GOMAXPROCS threads are busy. Costs to know: each wake-up is still a syscall pair (<code>epoll_wait</code> + <code>read</code>), and very high connection churn stresses <code>accept</code> and fd registration.</p>`,
          interview: 'Walk through Read -> EAGAIN -> gopark -> epoll_wait -> ready list -> goroutine runnable -> read again, mention edge-triggered registration once per fd and deadlines as timers, and contrast with file I/O and cgo which block OS threads. This is one of the most common Go-internals questions in senior interviews.',
          examples: [
            {
              label: 'Watch the netpoller at work with strace',
              lang: 'bash',
              code: `$ strace -f -e trace=epoll_create1,epoll_ctl,epoll_pwait,accept4,read ./hello-server
[pid 4121] epoll_create1(EPOLL_CLOEXEC)  = 4
[pid 4121] epoll_ctl(4, EPOLL_CTL_ADD, 3, {events=EPOLLIN|EPOLLOUT|EPOLLRDHUP|EPOLLET, data=...}) = 0
[pid 4121] accept4(3, 0xc00005fb10, [112], SOCK_CLOEXEC|SOCK_NONBLOCK) = -1 EAGAIN (Resource temporarily unavailable)
                                   # Accept goroutine parks; no thread blocks in accept
[pid 4125] epoll_pwait(4, [{events=EPOLLIN, data=...}], 128, -1, NULL, 0) = 1
[pid 4125] accept4(3, {sa_family=AF_INET, sin_port=htons(51522), ...}, [112 => 16], SOCK_CLOEXEC|SOCK_NONBLOCK) = 7
[pid 4125] epoll_ctl(4, EPOLL_CTL_ADD, 7, {events=EPOLLIN|EPOLLOUT|EPOLLRDHUP|EPOLLET, data=...}) = 0
[pid 4125] read(7, "GET / HTTP/1.1\\r\\nHost: localhost:8080\\r\\n"..., 4096) = 78
[pid 4125] read(7, 0xc000180000, 4096) = -1 EAGAIN (Resource temporarily unavailable)
                                   # connection goroutine parks until the next request
[pid 4125] epoll_pwait(4, ...`
            }
          ]
        },
        {
          title: 'Linux Namespaces & cgroups: The Basis of Containers',
          def: `<p>A container is just a Linux process (tree) with a restricted <strong>view</strong> (namespaces) and restricted <strong>resources</strong> (cgroups), plus a layered root filesystem and security filters. There is no "container" object in the kernel.</p>
<table><thead><tr><th>Namespace</th><th>Isolates</th><th>Clone flag</th></tr></thead><tbody>
<tr><td>Mount</td><td>Mount table (own root filesystem)</td><td><code>CLONE_NEWNS</code></td></tr>
<tr><td>PID</td><td>Process IDs (app sees itself as PID 1)</td><td><code>CLONE_NEWPID</code></td></tr>
<tr><td>Network</td><td>Interfaces, routes, iptables, ports</td><td><code>CLONE_NEWNET</code></td></tr>
<tr><td>UTS</td><td>Hostname, domain name</td><td><code>CLONE_NEWUTS</code></td></tr>
<tr><td>IPC</td><td>System V IPC, POSIX message queues</td><td><code>CLONE_NEWIPC</code></td></tr>
<tr><td>User</td><td>UID/GID mappings (root inside, unprivileged outside)</td><td><code>CLONE_NEWUSER</code></td></tr>
<tr><td>Cgroup</td><td>View of the cgroup hierarchy</td><td><code>CLONE_NEWCGROUP</code></td></tr>
<tr><td>Time</td><td>Monotonic/boot clocks offsets</td><td><code>CLONE_NEWTIME</code></td></tr>
</tbody></table>
<p>A Kubernetes pod's containers share the network (and optionally PID) namespace — that's why they can talk over <code>localhost</code>. The "pause" container holds the namespaces. <strong>User namespaces for pods</strong> (<code>hostUsers: false</code>; beta since 1.30, on by default in recent releases where the kernel and runtime support it) map root in the container to an unprivileged UID range on the host, so a container escape does not land as host root.</p>
<p><strong>cgroups v2</strong> (unified hierarchy under <code>/sys/fs/cgroup</code>) limit and account resources per group of processes. It is the default on all current distributions (RHEL 9+, Ubuntu 22.04+, Debian 11+, Bottlerocket, COS); Kubernetes put cgroup v1 into maintenance mode in 1.31 and is removing it, so v1-only features and tooling are legacy. Differences that bite: one hierarchy for all controllers, processes live only in leaf cgroups, and safe delegation of a subtree to an unprivileged user (how rootless containers and systemd user sessions work).</p>
<ul><li><code>cpu.max</code> (quota/period ← K8s CPU limit), <code>cpu.weight</code> (← CPU request)</li>
<li><code>memory.max</code> (hard limit → OOM kill), <code>memory.high</code> (throttle), <code>memory.current</code>, <code>memory.events</code></li>
<li><code>io.max</code> (bytes/IOPS per device), <code>pids.max</code> (fork-bomb protection), <code>cpuset.cpus</code></li>
<li>PSI files (<code>cpu.pressure</code>, <code>memory.pressure</code>, <code>io.pressure</code>) show time stalled on each resource.</li></ul>
<p>The rest of the container: <strong>overlayfs</strong> layers for the image, <strong>capabilities</strong> (drop root powers), <strong>seccomp</strong> (syscall allow-list), <strong>LSMs</strong> (AppArmor/SELinux). Containers share the host kernel — a kernel exploit escapes the container, which is why sandboxes like gVisor or Kata/Firecracker microVMs exist for untrusted code.</p>`,
          interview: 'List the namespaces and what each isolates, explain that cgroups limit and account resources (map K8s requests/limits to cpu.weight, cpu.max, memory.max), and say clearly that containers share the host kernel. Bonus: pods share the network namespace via the pause container; gVisor/Firecracker for stronger isolation.',
          examples: [
            {
              label: 'Build a "container" by hand with unshare',
              lang: 'bash',
              code: `$ sudo unshare --pid --fork --mount-proc --uts --net --ipc bash
# hostname sandbox && hostname
sandbox
# ps -ef
UID   PID  PPID  C STIME TTY      TIME     CMD
root    1     0  0 10:02 pts/0    00:00:00 bash          # PID namespace: we are PID 1
root    8     1  0 10:02 pts/0    00:00:00 ps -ef
# ip link
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN ...    # empty network namespace

# On the host: inspect namespaces and a pod's cgroup
$ lsns -p $(pgrep -f "bash" | tail -1)
$ cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/*/cpu.max | head -1
200000 100000                                            # 2 CPUs: 200 ms per 100 ms`
            }
          ]
        },
        {
          title: 'File Systems: Inodes, Links, Journaling & the VFS',
          def: `<p>Linux presents every file system (ext4, XFS, btrfs, overlayfs, tmpfs, NFS, procfs) through the <strong>VFS</strong> layer and four common objects: the <em>superblock</em> (a mounted file system), the <em>inode</em> (one file's metadata), the <em>dentry</em> (a name in a directory pointing at an inode, cached in the dentry cache) and the <em>file</em> (an open file description with offset and flags, which your fd points to).</p>
<ul><li>An <strong>inode</strong> stores type, permissions, owner, size, timestamps, link count and the location of the data (ext4 extents, XFS B+trees), but <em>not</em> the file's name.</li>
<li>A <strong>directory</strong> is a table of name → inode-number entries; path lookup walks it one component at a time (almost free when the dentry cache is warm).</li>
<li><strong>Hard link</strong>: a second directory entry for the same inode (same inode number, link count + 1; cannot cross file systems or point at directories). <strong>Symbolic link</strong>: a tiny file containing a path; it can cross file systems and can dangle.</li>
<li><strong>Deleting</strong> (<code>unlink</code>) removes a name. The blocks are freed only when the link count reaches 0 <em>and</em> no process still has the file open. Hence the classic "<code>df</code> says the disk is full but <code>du</code> finds little": a rotated-away log still held open (<code>lsof +L1</code> shows it).</li>
<li>You can run out of <strong>inodes</strong> before bytes (millions of tiny files, image layers, caches): check <code>df -i</code>.</li></ul>
<p><strong>Crash consistency</strong>: one logical change (append, create, rename) updates several blocks: data, inode, allocation bitmap, directory. A crash in between leaves them inconsistent. <strong>Journaling</strong> (ext4, XFS) first writes the intended metadata changes to a log and commits them, then applies them in place; after a crash the journal is replayed in seconds instead of a full <code>fsck</code>. ext4's default <code>data=ordered</code> journals only metadata but writes the data blocks <em>before</em> the metadata that points to them, so files never expose stale garbage. Copy-on-write file systems (btrfs, ZFS) never overwrite in place and commit by switching a root pointer.</p>
<table><thead><tr><th>Operation</th><th>Atomic?</th><th>Durable when?</th></tr></thead><tbody>
<tr><td><code>rename()</code> within one file system</td><td>Yes: readers see the old or the new file</td><td>After fsync of the directory</td></tr>
<tr><td><code>write()</code> of many bytes</td><td>No: a crash can leave a torn or partial write</td><td>After fsync/fdatasync of the file</td></tr>
<tr><td><code>O_APPEND</code> write</td><td>Offset update is atomic, so concurrent appenders do not overwrite each other</td><td>After fsync</td></tr>
<tr><td>Create a file</td><td>Yes</td><td>After fsync of the file <em>and</em> its directory</td></tr>
</tbody></table>
<p><strong>Containers</strong>: image layers are stacked with <strong>overlayfs</strong>, read-only lower layers plus a per-container writable upper layer. Modifying a file from a lower layer triggers a <em>copy-up</em> of the entire file (slow for big files, lost when the container is removed), and deletions are recorded as "whiteout" entries. Write heavy or persistent data to volumes. tmpfs (and <code>emptyDir</code> with <code>medium: Memory</code>) lives in RAM and is charged to the container's memory cgroup.</p>`,
          interview: 'Explain inode vs dentry vs open file description, hard vs symbolic links, and the classic "df says full, du says not" (deleted files still held open; lsof +L1). Know which operations are atomic (rename) and which are not (multi-block writes), why journaling exists and what ext4 data=ordered guarantees, inode exhaustion (df -i), and why writing into the container layer is slow (overlayfs copy-up).',
          examples: [
            {
              label: 'Links, inodes and the deleted-but-open file',
              lang: 'bash',
              code: `$ ln app.log hard.log && ln -s app.log soft.log && ls -li app.log hard.log soft.log
1311 -rw-r--r-- 2 app app 4096 Oct 29 10:00 app.log      # inode 1311, link count 2
1311 -rw-r--r-- 2 app app 4096 Oct 29 10:00 hard.log     # same inode: a hard link
1342 lrwxrwxrwx 1 app app    7 Oct 29 10:00 soft.log -> app.log

$ df -h /var ; sudo du -sh /var
Filesystem      Size  Used Avail Use% Mounted on
/dev/nvme0n1p3   50G   50G     0 100% /var
11G     /var                                 # ~39 GB unaccounted for

$ sudo lsof +L1 /var | head -2               # open files with link count < 1
COMMAND  PID USER FD  TYPE DEVICE    SIZE/OFF NLINK NODE NAME
api     4121 app  7w  REG  259,3  41875931136     0 2231 /var/log/api/app.log (deleted)
# Log rotation unlinked the file, but api still writes to fd 7.
# Fix now: make the app reopen its log (SIGHUP / restart), or truncate via
#   : | sudo tee /proc/4121/fd/7
# Fix for good: rotation with reopen-on-signal or copytruncate.

$ df -i /var                                 # inode exhaustion check`
            }
          ]
        },
        {
          title: 'Virtualization: Hypervisors, VT-x/EPT, virtio & MicroVMs',
          def: `<p>Almost every cloud instance is a virtual machine. Knowing what the hypervisor does explains steal time, why cloud I/O devices look the way they do, why TLB misses cost more in VMs, and how microVMs make per-tenant isolation cheap.</p>
<ul><li><strong>Type 1</strong> hypervisors run directly on the hardware (Xen, Hyper-V, ESXi, and KVM, which turns Linux itself into one); <strong>Type 2</strong> run as an application on a host OS (VirtualBox, VMware Workstation).</li>
<li><strong>Hardware-assisted virtualization</strong> (Intel VT-x, AMD-V, ARM EL2): the guest kernel runs at its normal privilege level in a special guest mode. Sensitive events (certain instructions, port/MMIO accesses to emulated devices, some interrupts and faults) cause a <strong>VM exit</strong> into the hypervisor, roughly a microsecond for the round trip, which handles them and resumes the guest. Performance work in hypervisors is mostly about avoiding exits.</li>
<li><strong>Nested paging</strong> (Intel EPT, AMD NPT): the MMU translates guest-virtual → guest-physical → host-physical in hardware, so guests manage their own page tables without exits. The cost: a TLB miss becomes a two-dimensional walk of up to 24 memory references (each of the guest's 4 levels needs its own host walk) instead of 4, which is why huge pages in the guest <em>and</em> the host matter for VMs.</li></ul>
<table><thead><tr><th>I/O approach</th><th>How</th><th>Cost</th></tr></thead><tbody>
<tr><td>Full emulation</td><td>Hypervisor emulates a real device (e1000 NIC, IDE disk)</td><td>A VM exit per register access: slow</td></tr>
<tr><td>Paravirtual (virtio)</td><td>Guest driver knows it is virtualised; shared-memory descriptor rings plus a doorbell notification</td><td>Few exits; standard in KVM, Firecracker, GCP</td></tr>
<tr><td>Passthrough / SR-IOV</td><td>The device exposes virtual functions mapped straight into the guest; the IOMMU confines its DMA to guest memory</td><td>Near-native; AWS ENA NICs and EBS NVMe via Nitro cards</td></tr>
</tbody></table>
<p><strong>AWS Nitro</strong>: a minimal KVM-based hypervisor, with networking, EBS storage, monitoring and security offloaded to dedicated Nitro cards that appear in the guest as PCIe devices (ENA, NVMe). Almost all host CPU goes to guests, and bare-metal instances drop even the thin hypervisor.</p>
<p><strong>Steal time</strong> (<code>st</code> in <code>top</code>/<code>vmstat</code>): time a vCPU was runnable but the hypervisor ran something else, from an oversubscribed host or from exhausted CPU credits on burstable instances (AWS T family). It appears as latency while the guest looks idle, and nothing inside the guest can fix it: change the instance type or host.</p>
<p><strong>Isolation spectrum</strong>: containers share the host kernel (millisecond start, weakest boundary); VMs run their own kernel (strong boundary, heavier). <strong>MicroVMs</strong> (Firecracker, Cloud Hypervisor) keep only a few virtio devices and boot a minimal kernel in ~125 ms with &lt; 5 MiB of overhead; Firecracker isolates AWS Lambda functions and Fargate tasks. Kata Containers runs each pod in a microVM behind the normal container APIs; gVisor instead intercepts syscalls with a user-space kernel. Confidential VMs (AMD SEV-SNP, Intel TDX) also encrypt guest memory against the host.</p>`,
          interview: 'Explain trap-and-emulate with VT-x/AMD-V (VM exits), nested paging (EPT/NPT) and why a TLB miss costs more inside a VM, and the I/O spectrum from full emulation to virtio to SR-IOV/Nitro. Be ready to explain steal time (what st means and why you cannot fix it inside the guest) and to compare containers, VMs, microVMs (Firecracker behind Lambda/Fargate) and gVisor as isolation choices for multi-tenant workloads.',
          examples: [
            {
              label: 'Recognise a VM, its virtual devices and steal time',
              lang: 'bash',
              code: `$ lscpu | grep -E 'Hypervisor vendor|Virtualization type'
Hypervisor vendor:   KVM
Virtualization type: full

$ systemd-detect-virt
amazon                                   # AWS Nitro (KVM-based)

$ lspci | grep -Ei 'ethernet|non-volatile'
00:04.0 Non-Volatile memory controller: Amazon.com, Inc. NVMe EBS Controller
00:05.0 Ethernet controller: Amazon.com, Inc. Elastic Network Adapter (ENA)

$ vmstat 1 3
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 3  0      0 912344  10240 812332    0    0     0     4 2210 4120 38  6 31  0 25
# st = 25%: a quarter of the time our vCPUs wanted to run but the host ran
# someone else (or a burstable instance ran out of CPU credits).`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Explain blocking, non-blocking, multiplexed and asynchronous I/O',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Who waits, and where: the thread in the kernel, the app in a loop, one call for many fds, or nobody?</li><li>Readiness vs completion notifications.</li><li>Which model does Go present to you, and which does it use internally?</li></ul>`,
          solution: `Blocking: read() sleeps the thread until data arrives. Simple; one thread
per concurrent operation.

Non-blocking: read() on an O_NONBLOCK fd returns EAGAIN immediately when no
data; on its own leads to busy loops.

Multiplexing (select/poll/epoll/kqueue): one call blocks until ANY of many
fds is ready, then you perform non-blocking reads on the ready ones.
Readiness-based: "a read won't block now".

Async (io_uring, IOCP, POSIX AIO): submit the read with a buffer; the kernel
completes it and you later collect a completion event.
Completion-based: "the read is done".

Go: you write blocking-style code per goroutine; the runtime uses
non-blocking sockets + epoll (multiplexing) and parks goroutines, so only
goroutines block, not threads. Regular files use real blocking syscalls
with P handoff because readiness doesn't apply to disk files.`,
          lang: 'text'
        },
        {
          t: 'Fix "too many open files" in a Go service',
          d: 'easy',
          type: 'debug',
          hint: `<ul><li>Is it a genuine need (many connections) or a leak? Count fds over time: <code>ls /proc/PID/fd | wc -l</code>, <code>lsof -p PID</code>.</li><li>Classic leak: not closing <code>resp.Body</code>; also files, <code>CLOSE_WAIT</code> sockets.</li><li>Check limits: <code>cat /proc/PID/limits</code>, systemd <code>LimitNOFILE</code>, container runtime defaults.</li></ul>`,
          solution: `1. Measure:
   $ ls /proc/$(pgrep api)/fd | wc -l            -> 1024 and climbing
   $ grep 'open files' /proc/$(pgrep api)/limits  -> soft 1024, hard 1024
   $ lsof -p $(pgrep api) | awk '{print $5}' | sort | uniq -c
       981 IPv4                                   -> sockets
   $ ss -tanp | grep api | awk '{print $1}' | sort | uniq -c
       930 CLOSE-WAIT                             -> peer closed, WE never closed

2. Root cause (typical): an HTTP client call path that returns early on
   non-200 without closing the body:
       resp, err := client.Do(req)
       if err != nil { return err }
       defer resp.Body.Close()                  // must be right after the err check
       if resp.StatusCode != http.StatusOK { ... }
   Also drain the body (io.Copy(io.Discard, resp.Body)) so the keep-alive
   connection can be reused instead of opening new ones.

3. Limits (only after fixing leaks): raise LimitNOFILE (systemd) or the
   container's ulimit; Go 1.19+ raises the soft limit to the hard limit at
   startup automatically.

4. Prevent: metric process_open_fds vs process_max_fds (Prometheus Go
   collector), alert at 80%; bodyclose linter in CI.`,
          lang: 'text'
        },
        {
          t: 'Compare select, poll and epoll for 50,000 mostly idle connections',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>What does each call copy between user and kernel on every wait?</li><li>What is the cost when only 10 of 50,000 fds are active?</li><li>Any hard limits?</li></ul>`,
          solution: `select:
- fd_set bitmaps limited to FD_SETSIZE (1024) -> cannot even hold 50k fds.
- Each call copies the bitmaps in and out and the kernel scans all fds: O(n).

poll:
- No fd limit, but each call passes all 50,000 pollfd structs (8 bytes each
  = 400 KB copied in, scanned, copied out) even if 10 are ready: O(n).
- At 10k waits/s that's ~4 GB/s of pointless copying and scanning.

epoll:
- Interest set registered once (epoll_ctl), kept in a kernel red-black tree.
- Socket wake-ups push items onto a ready list via callbacks.
- epoll_wait returns only the 10 ready fds: O(ready), independent of the
  50,000 idle ones.
- Edge-triggered mode further cuts repeated notifications.

Hence nginx, Redis, Node.js (libuv) and Go's runtime all use epoll on Linux
(kqueue on BSD/macOS).`,
          lang: 'text'
        },
        {
          t: 'Write a file durably with atomic replace',
          d: 'medium',
          type: 'coding',
          hint: `<ul><li>Write to a temp file in the <em>same directory</em>, <code>Sync()</code>, <code>Close()</code>, then <code>os.Rename</code>.</li><li>Why must you also fsync the parent directory?</li><li>What happens to readers during the rename? What if the process crashes midway?</li></ul>`,
          solution: `See the WriteFileAtomic example in the "File Descriptors, the Page Cache,
fsync & Zero-Copy" topic. Reasoning for each step:

1. Temp file in the same directory: rename(2) is atomic only within one
   filesystem; a temp file in /tmp might be on tmpfs.
2. Write all data, then f.Sync(): without fsync, data sits in the page cache;
   after a power loss the renamed file could exist but be empty/partial
   (classic ext4 zero-length-file issue).
3. Close, then os.Rename(tmp, path): readers opening path see the old inode
   or the new one, never a mix. Open file handles keep reading the old inode.
4. fsync the parent directory: the directory entry change (rename) is
   metadata of the directory; without it, after a crash the rename may be
   lost and the old file reappears.

Crash analysis:
- Before rename: old file intact; temp file garbage (cleanup on startup).
- After rename but before dir fsync: either old or new version, both valid.
- After dir fsync: new version guaranteed.
Treat any Sync error as fatal for that write (don't retry blindly: fsyncgate).`,
          lang: 'text'
        },
        {
          t: 'Serve large files with zero-copy in Go',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Use <code>http.ServeContent</code>/<code>http.ServeFile</code> or <code>io.Copy(conn, file)</code>; on Linux the runtime uses <code>sendfile</code> for plain TCP.</li><li>Verify with <code>strace -f -e trace=sendfile,read,write</code>.</li><li>Why does the copy path change under TLS, and what are the options?</li></ul>`,
          solution: `package main

import (
    "log"
    "net/http"
    "os"
)

func main() {
    http.HandleFunc("GET /video", func(w http.ResponseWriter, r *http.Request) {
        f, err := os.Open("/srv/media/big.mp4")
        if err != nil {
            http.Error(w, "not found", http.StatusNotFound)
            return
        }
        defer f.Close()
        st, err := f.Stat()
        if err != nil {
            http.Error(w, "stat failed", http.StatusInternalServerError)
            return
        }
        // Handles Range requests, If-Modified-Since, Content-Type, and on Linux
        // reaches (*net.TCPConn).ReadFrom(*os.File) -> sendfile(2).
        http.ServeContent(w, r, st.Name(), st.ModTime(), f)
    })
    log.Fatal(http.ListenAndServe(":8080", nil))
}

// $ strace -f -e trace=sendfile,read,write ./server   (then curl the URL)
// [pid 8812] sendfile(7, 9, NULL, 4194304) = 4194304
// [pid 8812] sendfile(7, 9, NULL, 4194304) = 4194304
// ...   no read()/write() pairs for the body: page cache -> socket in-kernel.
//
// Under HTTPS, bytes must be encrypted in user space (crypto/tls), so the
// server falls back to read + encrypt + write. Options: terminate TLS at a
// proxy/CDN, or kernel TLS (kTLS) offload in servers that support it.
// TCP -> TCP proxies: io.Copy(dst, src) between *net.TCPConn uses splice(2).`,
          lang: 'go'
        },
        {
          t: 'Debug an edge-triggered epoll server that stalls',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>Clients sometimes hang: they sent a request but never get a response; tcpdump shows the server ACKed the data.</li><li>The loop does one <code>read()</code> of 4 KiB per <code>EPOLLIN</code> event with <code>EPOLLET</code> set.</li><li>What does edge-triggered promise and what doesn't it?</li></ul>`,
          solution: `Root cause: with EPOLLET, epoll reports a transition (no data -> data).
If a client sends 10 KiB, the event fires once; the server reads 4 KiB and
goes back to epoll_wait. 6 KiB remain in the socket buffer, but no NEW data
arrives, so no new edge occurs -> the connection is never reported again.
The same applies to accept(): with many pending connections and one accept
per event, some connections are never accepted.

Fix: on every edge-triggered event, loop until EAGAIN:

    for {
        n, err := unix.Read(fd, buf)
        if n > 0 {
            handle(buf[:n])
        }
        if err == unix.EAGAIN {
            break // fully drained; safe to wait for the next edge
        }
        if err != nil || n == 0 {
            closeConn(fd)
            break
        }
    }

Similarly for writes: write until EAGAIN, then wait for EPOLLOUT.
Alternatives: use level-triggered mode (re-reported while readable), or
EPOLLONESHOT with explicit re-arm when using a worker pool, to prevent two
threads handling the same fd. Go's netpoller is edge-triggered and correct
because conn.Read always retries the syscall before parking.`,
          lang: 'text'
        },
        {
          t: 'Trace a Go HTTP request through the netpoller',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Run a hello-world <code>net/http</code> server under <code>strace -f</code> filtered to epoll and socket syscalls.</li><li>Identify: epoll creation, registration of the listener, <code>accept4</code> → <code>EAGAIN</code>, <code>epoll_pwait</code> wake-up, registration of the new connection, <code>read</code>, <code>EAGAIN</code> (keep-alive idle).</li><li>Then use <code>go tool trace</code> to see goroutines parking/unparking on network I/O.</li></ul>`,
          solution: `package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "hello")
    })
    http.ListenAndServe(":8080", nil)
}

// Terminal 1:
//   go build -o hello . && strace -f -e trace=epoll_create1,epoll_ctl,epoll_pwait,accept4,read,write ./hello
// Terminal 2:
//   curl -s localhost:8080/ ; curl -s localhost:8080/
//
// Expect (see the netpoller topic example):
//   epoll_create1 -> epfd
//   epoll_ctl(ADD, listener, EPOLLIN|EPOLLOUT|EPOLLRDHUP|EPOLLET)   once
//   accept4 -> EAGAIN                         (Accept goroutine parks)
//   epoll_pwait -> listener readable          (a thread with no work sleeps here)
//   accept4 -> new fd; epoll_ctl(ADD, new fd) (registered once, edge-triggered)
//   read -> "GET / HTTP/1.1..."; write -> "HTTP/1.1 200 OK..."
//   read -> EAGAIN                            (conn goroutine parks; keep-alive)
// Note how few threads (pids) appear: thousands of connections would still
// show a handful of threads, each looping over epoll_pwait.`,
          lang: 'go'
        },
        {
          t: 'Create a minimal container in Go with namespaces',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul><li>Re-exec yourself (<code>/proc/self/exe child</code>) with <code>SysProcAttr.Cloneflags</code> = UTS | PID | NS (| NET | USER).</li><li>In the child: set hostname, <code>chroot</code>/<code>pivot_root</code> into an unpacked rootfs (e.g. Alpine minirootfs), mount <code>/proc</code>, then exec the command.</li><li>Add a cgroup: create a directory under <code>/sys/fs/cgroup</code>, write <code>memory.max</code>/<code>pids.max</code>, write the child PID to <code>cgroup.procs</code>.</li><li>Linux only, run as root (or add <code>CLONE_NEWUSER</code> with UID mappings).</li></ul>`,
          solution: `//go:build linux

package main

import (
    "fmt"
    "os"
    "os/exec"
    "path/filepath"
    "strconv"
    "syscall"
)

// usage: sudo ./mini run /bin/sh
func main() {
    switch os.Args[1] {
    case "run":
        run()
    case "child":
        child()
    }
}

func run() {
    cmd := exec.Command("/proc/self/exe", append([]string{"child"}, os.Args[2:]...)...)
    cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
    cmd.SysProcAttr = &syscall.SysProcAttr{
        Cloneflags:   syscall.CLONE_NEWUTS | syscall.CLONE_NEWPID | syscall.CLONE_NEWNS | syscall.CLONE_NEWNET,
        Unshareflags: syscall.CLONE_NEWNS, // don't propagate our mounts to the host
    }
    must(cmd.Start())

    // cgroup v2: limit memory and process count. (Writing the PID after Start
    // leaves a tiny window where the child runs unconfined; production code
    // uses SysProcAttr{UseCgroupFD: true, CgroupFD: fd} (Go 1.20+, clone3
    // CLONE_INTO_CGROUP) to start the child directly inside the cgroup.
    // The memory and pids controllers must be enabled in the parent's
    // cgroup.subtree_control.)
    cg := "/sys/fs/cgroup/mini"
    must(os.MkdirAll(cg, 0o755))
    must(os.WriteFile(filepath.Join(cg, "memory.max"), []byte("100M"), 0o644))
    must(os.WriteFile(filepath.Join(cg, "pids.max"), []byte("20"), 0o644))
    must(os.WriteFile(filepath.Join(cg, "cgroup.procs"), []byte(strconv.Itoa(cmd.Process.Pid)), 0o644))

    _ = cmd.Wait()
    _ = os.Remove(cg)
}

func child() {
    fmt.Printf("child running as PID %d\\n", os.Getpid()) // 1 inside the new PID namespace
    must(syscall.Sethostname([]byte("mini")))
    must(syscall.Chroot("/var/lib/mini/rootfs")) // unpacked alpine minirootfs
    must(os.Chdir("/"))
    must(syscall.Mount("proc", "/proc", "proc", 0, ""))
    defer syscall.Unmount("/proc", 0)

    cmd := exec.Command(os.Args[2], os.Args[3:]...)
    cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
    must(cmd.Run())
}

func must(err error) {
    if err != nil {
        panic(err)
    }
}

// Inside: hostname -> mini; ps -> only sh and ps; ip link -> only lo;
// a fork bomb stops at 20 processes; allocating > 100M gets OOM-killed.
// Missing vs real runtimes: pivot_root, user namespaces, capabilities,
// seccomp, overlayfs layers, networking (veth + bridge), image handling.`,
          lang: 'go'
        },
        {
          t: 'Diagnose write latency spikes caused by dirty page writeback',
          d: 'hard',
          type: 'debug',
          hint: `<ul><li>A service writes logs/data with plain <code>write()</code> calls; every ~30 s p99 latency jumps to seconds, even for requests that don't write.</li><li>Look at <code>Dirty</code>/<code>Writeback</code> in <code>/proc/meminfo</code>, <code>vm.dirty_*</code> settings, <code>iostat -x</code>, and PSI <code>io.pressure</code>.</li><li>Consider how <code>dirty_ratio</code> throttling and large fsyncs interact with other I/O on the same disk.</li></ul>`,
          solution: `Observations
  $ watch -n1 'grep -E "^(Dirty|Writeback):" /proc/meminfo'
  Dirty:   6123456 kB   <- GBs of dirty data accumulate, then flush at once
  $ sysctl vm.dirty_ratio vm.dirty_background_ratio vm.dirty_expire_centisecs
  vm.dirty_ratio = 20 ; vm.dirty_background_ratio = 10 ; dirty_expire_centisecs = 3000
  $ iostat -x 1  -> during spikes: w/s and wkB/s peak, %util 100, w_await 800 ms
  $ cat /proc/pressure/io -> full avg10 high during spikes

Mechanism
- On a 128 GB host, 10% background ratio = ~12.8 GB of dirty pages allowed
  before background writeback starts; expiry flushes 30 s-old data in bursts.
- The burst saturates the device queue; reads and small fsyncs (e.g. the
  database or the service's own WAL) queue behind it -> seconds of latency.
- If dirty_ratio is reached, every writing thread is throttled inside write().

Fixes
- Smooth writeback: use byte-based limits (vm.dirty_background_bytes = 256MB,
  vm.dirty_bytes = 1GB) instead of percentages on large-RAM hosts.
- Application: fsync/fdatasync incrementally (e.g. every N MB) or use
  sync_file_range to start writeback early; batch writes; don't fsync a huge
  file at once on the request path.
- Isolate: put logs and data on separate devices, or use cgroup io.max /
  io.weight to stop a batch writer starving the latency-critical service.
- Verify: Dirty stays below a few hundred MB; w_await flat; p99 stable.`,
          lang: 'text'
        },
        {
          t: 'Design the write path of a high-throughput, durable log service',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Requirements: 500K appends/s of ~200 B records, acknowledged only when durable, p99 &lt; 10 ms.</li><li>fsync per record is impossible (NVMe ~20–100 µs per flush, plus queueing). How do you amortise it?</li><li>Consider: append-only segments, group commit, page cache vs O_DIRECT, preallocation, io_uring, replication as an alternative to local fsync.</li></ul>`,
          solution: `Design
1. Append-only segment files (e.g. 1 GiB), preallocated with fallocate to
   avoid metadata updates on every extend; index files map offset -> position.
2. Group commit: requests enqueue records into an in-memory batch; a single
   writer goroutine writes the batch with one write()/writev (or io_uring
   submission) and one fdatasync, then acks all requests in the batch.
   Batch when either 1 ms elapsed or 1 MiB accumulated:
     500K rec/s * 200 B = 100 MB/s -> ~100-1000 fdatasyncs/s, well within NVMe.
   Latency = wait-for-batch + write + flush ~ 1-3 ms.
3. fdatasync instead of fsync (no mtime update needed); preallocation keeps
   file size stable so fdatasync skips metadata.
4. Page cache vs O_DIRECT: page cache gives cheap tail reads for consumers
   (sendfile to them, like Kafka); O_DIRECT + own cache gives predictable
   memory use and avoids double caching. Start with page cache.
5. Durability alternative: replicate to 2 other nodes and ack on quorum
   in-memory receipt (Kafka acks=all without per-message fsync); local fsync
   is periodic. Trade-off: correlated power loss vs latency.
6. Safety: CRC per record, segment headers with versions, recovery scans the
   last segment and truncates torn writes; treat fsync errors as fatal
   (stop accepting writes, fail over).
7. Backpressure: bounded batch queue; when full, reject or slow producers
   rather than buffering unboundedly.
8. Observability: batch size histogram, fsync latency histogram, queue
   depth, iostat w_await, io.pressure.`,
          lang: 'text'
        },
        {
          t: 'Debug a full disk that du says is half empty',
          d: 'easy',
          type: 'debug',
          hint: `<ul><li>Alert: <code>/var</code> is 100% full and writes fail with <code>ENOSPC</code>. <code>du -sh /var</code> reports only 11 GB of a 50 GB volume.</li><li>When are a file's blocks actually freed after <code>rm</code>?</li><li>Tools: <code>lsof +L1</code>, <code>ls -l /proc/*/fd</code>, <code>df -i</code>.</li><li>Two other causes of a df/du mismatch: inode exhaustion, and files hidden under a mount point.</li></ul>`,
          solution: `1. Confirm the mismatch
   df -h /var       -> 50G used, 0 avail
   du -sh -x /var   -> 11G
2. Look for deleted-but-open files (link count 0, still referenced by an fd)
   sudo lsof +L1 /var
   -> api (PID 4121) fd 7 /var/log/api/app.log (deleted), 39 GB
   Log rotation renamed/deleted the file, but the process kept writing to its
   open fd. The inode and its blocks live until the last fd is closed.
3. Recover space
   - Best: make the process reopen its logs (SIGHUP if supported) or restart it.
   - Emergency without restart: truncate through the fd
       : | sudo tee /proc/4121/fd/7
4. Prevent
   - logrotate with copytruncate, or postrotate signalling the app to reopen;
   - in containers, log to stdout and let the runtime rotate;
   - alert on disk usage AND on "deleted but open" size (node exporter).
Other causes to rule out:
   - df -i -> 100% IUse: inode exhaustion (millions of tiny files) gives
     ENOSPC with free bytes.
   - Files written under a directory before a volume was mounted over it are
     invisible to du but still use space (bind-mount the parent elsewhere
     to inspect).
   - Reserved blocks: ext4 reserves 5% for root by default (tune2fs -m).`,
          lang: 'text'
        },
        {
          t: 'Diagnose latency on a VM with high steal time',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>A latency-sensitive service on a cloud VM has p99 spikes; inside the guest CPU looks 40% idle, yet requests queue.</li><li>Check <code>st</code> in <code>vmstat 1</code>/<code>top</code>, and <code>mpstat -P ALL</code> per vCPU.</li><li>Which instance types are prone to it (burstable credits, oversubscribed shared tenancy)? What can and cannot be fixed from inside the guest?</li></ul>`,
          solution: `Observations
  vmstat 1 -> us 35, sy 5, id 35, st 25   (steal 20-30% during spikes)
  The guest wanted CPU, but the hypervisor ran other work: the run queue
  grows and latency rises while "idle" looks healthy.

Common causes
  - Burstable instances (AWS T family) out of CPU credits: the host caps the
    vCPU at its baseline, which shows up as steal. Check the
    CPUCreditBalance metric; enable unlimited mode or move to a fixed-
    performance family.
  - Shared hosts with noisy neighbours / oversubscription (some smaller or
    older instance types, nested virtualisation).
  - Live-migration or host maintenance events (short bursts).

Actions
  - Nothing inside the guest removes steal: change instance type/size, use
    dedicated or bare-metal hosts for the most sensitive tiers, or spread
    replicas so one bad host hurts only one instance.
  - Make capacity planning steal-aware: alert on st > ~5% sustained, and
    treat it as lost capacity in utilisation math.
  - Kubernetes: the kubelet cannot see steal as usage, so nodes look
    underused; scale on latency/saturation signals, not CPU alone.
  - Verify after the change: st ~ 0, p99 back to baseline.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'How does epoll work, and why does it scale better than select/poll?',
          a: `<p><strong>API</strong>: <code>epoll_create1()</code> returns an epoll fd; <code>epoll_ctl(ADD/MOD/DEL, fd, events)</code> manages the interest list once; <code>epoll_wait()</code> blocks until some registered fds are ready and returns only those.</p>
<p><strong>Kernel internals</strong>: the epoll instance holds a red-black tree of registered items (fast add/remove/lookup) and a ready list. On <code>ADD</code>, the kernel hooks a callback into the target file's wait queue. When a socket receives data (softirq processing), it wakes its wait queue; epoll's callback appends that item to the ready list and wakes a thread in <code>epoll_wait</code>, which copies out up to <em>maxevents</em> ready items.</p>
<p><strong>Why it scales</strong>: select/poll pass and scan the entire fd set on every call — O(n) per wait, plus select's 1024-fd limit. epoll's cost is O(ready), so 100K idle connections cost nothing per wait.</p>
<p><strong>Triggering</strong>: level-triggered re-reports while the fd stays ready; edge-triggered reports only on new arrivals, so you must drain to <code>EAGAIN</code>. <code>EPOLLONESHOT</code> disables after one event (safe hand-off to worker threads); <code>EPOLLEXCLUSIVE</code> avoids thundering herds on shared listeners.</p>
<p><strong>Limits</strong>: it's readiness-based, so it doesn't help regular files; each event still costs a syscall for the actual read/write — io_uring addresses both.</p>`
        },
        {
          q: 'How does Go\'s netpoller make blocking-style code scale to 100,000 connections?',
          a: `<p>Sockets in Go are non-blocking and registered once with epoll in edge-triggered mode. <code>conn.Read</code> tries <code>read(2)</code>; on <code>EAGAIN</code> the goroutine parks and its <code>pollDesc</code> records it. The M picks another goroutine. When the scheduler polls (non-blocking during <code>findRunnable</code>, blocking <code>epoll_wait</code> when idle, sysmon as a fallback), ready pollDescs map back to parked goroutines, which become runnable and retry the read.</p>
<p>So 100K connections = 100K parked goroutines (a few KiB each) + kernel socket buffers, with only ~GOMAXPROCS threads running. You get thread-per-connection ergonomics (sequential code, stack traces, <code>defer</code>) with event-loop efficiency.</p>
<p>Caveats: regular file I/O and cgo calls block real threads (P handoff, thread growth); deadlines are timers on the pollDesc (always set server timeouts); memory per connection (bufio buffers, TLS state) dominates at scale; and per-connection goroutines that never exit are leaks.</p>`
        },
        {
          q: 'What happens when you call write() on a file? When is the data actually durable?',
          a: `<ol><li><code>write()</code> enters the kernel, finds the file's pages in the page cache (allocating them, possibly reading a partial page from disk), copies your bytes in, marks the pages dirty, updates the size/mtime in memory, and returns. Nothing has hit the disk.</li>
<li>Background flusher threads write dirty pages after they age (~30 s) or when dirty memory crosses thresholds; heavy writers can be throttled inside <code>write()</code>.</li>
<li>The block layer queues the I/O; the device DMAs it into its own (often volatile) cache.</li></ol>
<p>Durability requires <code>fsync()</code>/<code>fdatasync()</code> (Go: <code>f.Sync()</code>), which writes the file's dirty pages and metadata and issues a cache flush/FUA to the device. New or renamed files also need an fsync on the <em>directory</em>. <code>O_DIRECT</code> bypasses the page cache but still needs fsync for the device cache and metadata.</p>
<p>Gotchas: <code>close()</code> doesn't fsync; a failed fsync can lose data permanently (pages marked clean) — treat as fatal; fsync can take milliseconds and stall behind other I/O, so batch (group commit). Cloud block storage (EBS, PD) acknowledges flushes after replicating internally.</p>`
        },
        {
          q: 'How do containers work under the hood?',
          a: `<p>A container is an ordinary process isolated with kernel features:</p>
<ul><li><strong>Namespaces</strong> change what the process can <em>see</em>: mount (own root fs), PID (own PID 1), network (own interfaces/ports), UTS (hostname), IPC, user (UID mapping, rootless containers), cgroup, time.</li>
<li><strong>cgroups v2</strong> limit and account what it can <em>use</em>: <code>cpu.max</code>/<code>cpu.weight</code>, <code>memory.max</code>/<code>memory.high</code>, <code>io.max</code>, <code>pids.max</code>, with PSI pressure metrics.</li>
<li><strong>Filesystem</strong>: image layers stacked with overlayfs; a writable upper layer per container.</li>
<li><strong>Security</strong>: dropped capabilities, seccomp syscall filters, AppArmor/SELinux, read-only rootfs, no-new-privileges.</li></ul>
<p>The runtime stack: Kubernetes kubelet → CRI (containerd/CRI-O) → OCI runtime (runc) which calls <code>clone()</code> with namespace flags, sets up cgroups, <code>pivot_root</code>, applies seccomp and execs your binary. Pod containers share network (and optionally PID) namespaces through the pause container.</p>
<p>Key implication: all containers share the host kernel — kernel bugs are escape routes, and kernel-level resources (conntrack table, fds, PIDs) are shared unless limited. Stronger isolation uses gVisor (user-space kernel) or microVMs (Firecracker, Kata).</p>`
        },
        {
          q: 'What is zero-copy I/O and when does it help?',
          a: `<p>Traditional file-to-socket transfer (<code>read</code> + <code>write</code>): DMA disk → page cache, CPU copy page cache → user buffer, CPU copy user buffer → socket buffer, DMA socket buffer → NIC; 2 syscalls and 4 mode switches per chunk.</p>
<p><strong>sendfile(out_sock, in_file)</strong>: the kernel moves data from the page cache to the socket directly — no user-space copy; with scatter-gather DMA the NIC reads page-cache pages directly (zero CPU copies). <strong>splice</strong> moves data between any fd and a pipe (enabling socket→socket proxying); <code>MSG_ZEROCOPY</code> avoids the user→kernel copy for large sends; <strong>mmap</strong> avoids the read copy.</p>
<p>Helps when: serving static files/large blobs, message brokers delivering stored logs (Kafka), TCP proxies. Doesn't help when: data must be transformed in user space (TLS encryption without kTLS, compression, templating), small messages (syscall overhead dominates), or data isn't in the page cache.</p>
<p>Go: <code>io.Copy</code> automatically uses <code>sendfile</code> (file → TCP) and <code>splice</code> (TCP/Unix → TCP) on Linux via <code>ReaderFrom</code>/<code>WriterTo</code> — keep the concrete types (don't wrap the conn in a <code>bufio.Writer</code>) to benefit.</p>`
        }
      ],
      quiz: [
        { q: 'What is DMA?', a: 'Direct Memory Access: a device transfers data to or from RAM without the CPU copying it, then signals completion with an interrupt.' },
        { q: 'What does epoll_wait return?', a: 'Only the registered file descriptors that are ready (with their events), up to maxevents.' },
        { q: 'What must you do on an edge-triggered epoll event?', a: 'Read (or write) until the call returns EAGAIN, otherwise remaining data may never be reported again.' },
        { q: 'Does write() guarantee the data is on disk?', a: 'No. It only copies data into the page cache; fsync/fdatasync (and a directory fsync for new names) are needed for durability.' },
        { q: 'What does Go use to wait for network I/O on Linux?', a: 'The runtime netpoller, built on edge-triggered epoll; goroutines park instead of blocking OS threads.' },
        { q: 'Which syscall lets a server send a file to a socket without copying it through user space?', a: 'sendfile(2) (splice(2) for pipe-based transfers between fds).' },
        { q: 'Which Linux features make a container?', a: 'Namespaces (isolation of views), cgroups (resource limits), plus a layered root filesystem and security filters such as capabilities and seccomp.' },
        { q: 'What was the C10K problem?', a: 'Serving 10,000 concurrent connections on one server, which thread-per-connection designs and select/poll could not do efficiently.' },
        { q: 'What is the difference between a hard link and a symbolic link?', a: 'A hard link is another directory entry for the same inode (same file, same filesystem only); a symlink is a small file containing a path, which can cross filesystems and can dangle.' },
        { q: 'Why can df report a full disk while du finds much less data?', a: 'Deleted files that a process still holds open keep their blocks allocated until the last fd closes; lsof +L1 lists them.' },
        { q: 'What is steal time on a VM?', a: 'Time a vCPU was runnable but the hypervisor ran something else (oversubscription or exhausted CPU credits); it cannot be fixed from inside the guest.' },
        { q: 'Why does io_uring often fail inside containers?', a: 'Docker and containerd default seccomp profiles block the io_uring syscalls because of its security track record, and hosts can disable it with kernel.io_uring_disabled.' }
      ],
      resources: [
        { title: 'Linux man page — epoll(7)', url: 'https://man7.org/linux/man-pages/man7/epoll.7.html', type: 'docs' },
        { title: 'Linux man page — namespaces(7)', url: 'https://man7.org/linux/man-pages/man7/namespaces.7.html', type: 'docs' },
        { title: 'Linux man page — cgroups(7)', url: 'https://man7.org/linux/man-pages/man7/cgroups.7.html', type: 'docs' },
        { title: 'OSTEP — I/O Devices', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf', type: 'book' },
        { title: 'Linux man page — io_uring(7)', url: 'https://man7.org/linux/man-pages/man7/io_uring.7.html', type: 'docs' },
        { title: 'OSTEP — Crash Consistency: FSCK and Journaling', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf', type: 'book' },
        { title: 'Firecracker — secure and fast microVMs', url: 'https://firecracker-microvm.github.io/', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 8 ─────────────────────────────
    {
      n: 8,
      title: 'Performance Analysis & Systems Thinking',
      summary: 'A methodical toolkit for performance work: latency vs throughput and percentiles, Little\'s law and queueing, the USE method, Linux observability and profiling tools, flame graphs, benchmarking pitfalls and capacity planning.',
      topics: [
        {
          title: 'Latency vs Throughput & Percentiles',
          def: `<p><strong>Latency</strong> is the time for one operation (request start → response); <strong>throughput</strong> is operations completed per unit time. They're related but distinct: batching, pipelining and parallelism raise throughput, often at the cost of per-request latency; a system near saturation has high throughput <em>and</em> terrible latency.</p>
<p><strong>Use distributions, not averages.</strong> Latency is typically long-tailed (GC pauses, cache misses, retransmits, queueing, noisy neighbours). Report p50, p90, p99, p99.9 and max, computed from <strong>histograms</strong> (HDR histograms, Prometheus histograms) — you cannot average percentiles across instances.</p>
<table><thead><tr><th>Concept</th><th>Why it matters</th></tr></thead><tbody>
<tr><td>Tail at scale</td><td>If a request fans out to 100 backends that are each slow 1% of the time, <code>1 − 0.99<sup>100</sup> ≈ 63%</code> of user requests hit at least one slow backend</td></tr>
<tr><td>Service time vs response time</td><td>Response time = queueing delay + service time; under load, queueing dominates</td></tr>
<tr><td>Coordinated omission</td><td>Closed-loop load generators slow down when the server stalls, so they under-record the worst latencies; use constant-rate (open-loop) tools</td></tr>
<tr><td>Bandwidth vs latency</td><td>A 10 Gb/s link still has the same RTT; small sequential requests are latency-bound (batch or pipeline them)</td></tr>
</tbody></table>
<p>Mitigating tail latency: timeouts and deadlines (with <code>context</code>), hedged/backup requests after the p95, bounded queues and load shedding, reducing fan-out, isolating slow work, and fixing root causes (GC pressure, lock contention, throttling).</p>
<p>SLOs are typically framed on percentiles ("99% of requests &lt; 200 ms over 30 days"), which ties performance work directly to error budgets.</p>`,
          interview: 'Define latency and throughput precisely, insist on percentiles from histograms rather than averages, and compute the fan-out tail effect (1 - 0.99^N). Mentioning coordinated omission and hedged requests distinguishes senior candidates.',
          examples: [
            {
              label: 'Latency histogram from a constant-rate load test',
              lang: 'bash',
              code: `# Open-loop load at a fixed 2,000 req/s (avoids coordinated omission)
$ echo "GET http://api.internal:8080/orders/42" | vegeta attack -rate=2000 -duration=60s | vegeta report
Requests      [total, rate, throughput]  120000, 2000.02, 1999.71
Duration      [total, attack, wait]      1m0s, 59.999s, 9.1ms
Latencies     [min, mean, 50, 90, 95, 99, max]  2.1ms, 11.8ms, 7.4ms, 15.2ms, 24.9ms, 96.3ms, 812.4ms
Success       [ratio]                    99.97%
Status Codes  [code:count]               200:119964  503:36

# mean 11.8 ms looks fine; p99 96 ms and max 812 ms tell the real story.`
            }
          ]
        },
        {
          title: 'Little\'s Law & Queueing Intuition',
          def: `<p><strong>Little's law</strong>: in any stable system, <code>L = λ × W</code> — the average number of items in the system equals arrival rate times average time in the system. It holds regardless of distribution, for a whole service or any sub-component (a connection pool, a queue, a thread pool).</p>
<ul><li>2,000 req/s × 50 ms average latency = <strong>100 requests in flight</strong> on average → you need ~100 concurrent workers/connections (plus headroom for variance).</li>
<li>A DB pool of 20 connections with 5 ms queries supports at most 20 / 0.005 = <strong>4,000 queries/s</strong>.</li>
<li>If a Kafka consumer group lags 600K messages and drains 2K msgs/s net, catch-up takes 300 s.</li></ul>
<p><strong>Utilisation vs latency</strong>: for a single server with random arrivals and service times (M/M/1), mean response time is <code>W = S / (1 − ρ)</code>, where S is service time and ρ utilisation:</p>
<table><thead><tr><th>Utilisation ρ</th><th>Response time</th></tr></thead><tbody>
<tr><td>50%</td><td>2 × S</td></tr>
<tr><td>80%</td><td>5 × S</td></tr>
<tr><td>90%</td><td>10 × S</td></tr>
<tr><td>95%</td><td>20 × S</td></tr>
<tr><td>99%</td><td>100 × S</td></tr>
</tbody></table>
<p>Latency is a <strong>hockey stick</strong>: it barely moves until ~60–70% utilisation, then explodes. Variability (bursty arrivals, variable service times) makes it worse; more parallel servers (M/M/c) push the knee further right but don't remove it. This is why you can't run CPUs, disks, connection pools or brokers at 95% and expect good latency — and why queues must be <strong>bounded</strong>: past saturation (λ &gt; capacity) an unbounded queue grows forever and latency becomes infinite. Apply backpressure or shed load instead.</p>`,
          interview: 'State L = lambda x W and use it live: in-flight requests, pool sizes, catch-up times. Then explain the hockey-stick curve W = S/(1-rho) with numbers (80% utilisation = 5x service time), and conclude with bounded queues, backpressure and headroom targets.',
          examples: [
            {
              label: 'Little\'s law and M/M/1 calculator',
              lang: 'go',
              code: `package main

import "fmt"

func main() {
    // Little's law: in-flight = arrival rate x time in system
    rps, latency := 2000.0, 0.050 // req/s, seconds
    fmt.Printf("in-flight requests: %.0f\\n", rps*latency) // 100

    // M/M/1 response time vs utilisation for a 10 ms service time
    s := 10.0 // ms
    for _, rho := range []float64{0.5, 0.7, 0.8, 0.9, 0.95, 0.99} {
        fmt.Printf("rho=%.2f  W=%6.1f ms\\n", rho, s/(1-rho))
    }
}

// in-flight requests: 100
// rho=0.50  W=  20.0 ms
// rho=0.70  W=  33.3 ms
// rho=0.80  W=  50.0 ms
// rho=0.90  W= 100.0 ms
// rho=0.95  W= 200.0 ms
// rho=0.99  W=1000.0 ms`
            }
          ]
        },
        {
          title: 'The USE Method (and RED for Services)',
          def: `<p>Brendan Gregg's <strong>USE method</strong>: for every <em>resource</em>, check <strong>U</strong>tilisation, <strong>S</strong>aturation and <strong>E</strong>rrors. It turns "the server is slow" into a checklist that rarely misses a bottleneck.</p>
<ul><li><strong>Utilisation</strong>: fraction of time the resource was busy (or capacity used).</li>
<li><strong>Saturation</strong>: extra work it couldn't service — queue length, wait time.</li>
<li><strong>Errors</strong>: error events (often the quickest to check and the most ignored).</li></ul>
<table><thead><tr><th>Resource</th><th>Utilisation</th><th>Saturation</th><th>Errors</th></tr></thead><tbody>
<tr><td>CPU</td><td><code>mpstat -P ALL 1</code> (%usr+%sys per CPU)</td><td><code>vmstat 1</code> r &gt; CPU count; PSI <code>cpu.pressure</code>; cgroup throttling</td><td>Machine-check events (rare)</td></tr>
<tr><td>Memory</td><td><code>free -m</code> (used vs available)</td><td><code>vmstat</code> si/so, major faults, PSI memory, OOM kills</td><td><code>dmesg</code> OOM/ECC</td></tr>
<tr><td>Network</td><td><code>sar -n DEV 1</code> throughput vs link speed</td><td>Drops/overruns, TCP retransmits (<code>nstat</code>, <code>sar -n ETCP</code>), listen backlog overflows</td><td><code>ip -s link</code> errors</td></tr>
<tr><td>Disk I/O</td><td><code>iostat -xz 1</code> %util</td><td><code>aqu-sz</code>, <code>r_await</code>/<code>w_await</code>, PSI io</td><td><code>dmesg</code>, <code>smartctl</code></td></tr>
<tr><td>Software resources</td><td>Pool usage (DB conns, workers, fds)</td><td>Waiters for the pool, mutex wait time</td><td>Timeouts, <code>EMFILE</code></td></tr>
</tbody></table>
<p>Caveat: %util for SSD/NVMe and CPU utilisation averaged over all cores can hide saturation (devices serve requests in parallel; one hot core can bottleneck a single-threaded component). Always look per-CPU and at saturation metrics.</p>
<p>For request-driven services, complement USE with <strong>RED</strong>: <strong>R</strong>ate, <strong>E</strong>rrors, <strong>D</strong>uration (as histograms) per endpoint — or Google SRE's four golden signals (latency, traffic, errors, saturation). RED tells you <em>that</em> users are hurting; USE tells you <em>which resource</em> is why.</p>`,
          interview: 'Recite USE (utilisation, saturation, errors for every resource) and walk the checklist with concrete Linux commands; contrast with RED/golden signals for services. Interviewers love a structured approach to "the server is slow" instead of random guessing.',
          examples: [
            {
              label: 'The 60-second Linux performance checklist',
              lang: 'bash',
              code: `uptime                 # load averages: trend over 1/5/15 min (includes D-state tasks)
dmesg -T | tail        # OOM kills, TCP drops, I/O errors
vmstat 1               # r (run queue), free, si/so, us/sy/id/wa/st, cs
mpstat -P ALL 1        # per-CPU balance: one hot CPU? high %soft?
pidstat 1              # which processes use CPU
iostat -xz 1           # per-device r/s, w/s, await, aqu-sz, %util
free -m                # memory incl. page cache ("available" is what matters)
sar -n DEV 1           # network throughput per interface
sar -n TCP,ETCP 1      # active/passive opens, retransmits
top                    # overall check

# Example reading:
# vmstat: r=24 on 8 CPUs, us=85 sy=10  -> CPU saturated (U high, S high)
# iostat: %util 12, await 0.4 ms       -> disk fine
# sar ETCP: retrans/s 0.1              -> network fine
# => profile the CPU consumers (pidstat -> perf / pprof).`
            }
          ]
        },
        {
          title: 'Linux Observability Tools',
          def: `<table><thead><tr><th>Tool</th><th>Shows</th><th>Use for</th></tr></thead><tbody>
<tr><td><code>top</code> / <code>htop</code></td><td>Per-process CPU/mem, load, CPU states (us, sy, ni, id, wa, hi, si, st)</td><td>First look; <code>st</code> (steal) reveals noisy hypervisor neighbours</td></tr>
<tr><td><code>vmstat 1</code></td><td>Run queue, memory, swap, I/O, interrupts, context switches, CPU split</td><td>System-wide saturation at a glance</td></tr>
<tr><td><code>mpstat</code> / <code>pidstat</code></td><td>Per-CPU and per-process (CPU, <code>-w</code> context switches, <code>-d</code> disk)</td><td>Imbalance, who's switching/writing</td></tr>
<tr><td><code>iostat -xz</code></td><td>Per-device IOPS, throughput, latency (await), queue size</td><td>Disk bottlenecks</td></tr>
<tr><td><code>ss -tanp</code>, <code>nstat</code></td><td>Sockets, states, queues; TCP counters</td><td>Connection leaks, backlog, retransmits</td></tr>
<tr><td><code>strace</code></td><td>Every syscall with args and timing</td><td>Debugging behaviour (high overhead — avoid on hot prod paths)</td></tr>
<tr><td><code>perf</code></td><td>CPU sampling, hardware counters, tracepoints, scheduler analysis</td><td>Where CPU goes incl. kernel; IPC, cache misses</td></tr>
<tr><td>eBPF (<code>bpftrace</code>, BCC tools)</td><td>Low-overhead custom tracing in the kernel</td><td>Latency histograms (biolatency, runqlat), off-CPU analysis, tcpretrans</td></tr>
<tr><td>PSI (<code>/proc/pressure/*</code>)</td><td>% of time tasks stalled on CPU, memory, I/O</td><td>Direct saturation signal (per cgroup too)</td></tr>
</tbody></table>
<p>Reading CPU states: high <code>us</code> → your code (profile it); high <code>sy</code> → syscalls/locking/context switches; high <code>wa</code> → waiting on disk (iowait is idle time with outstanding I/O, not "busy"); high <code>si</code> → network softirq; <code>st</code> → stolen by the hypervisor.</p>
<p><strong>Load average</strong> on Linux counts runnable <em>and</em> uninterruptible (D-state) tasks, so high load can mean disk/NFS waits, not CPU. Compare with CPU count and check <code>vmstat</code> r vs b.</p>
<p>Containers: tools in a container see host-wide numbers for many metrics; use cgroup files (<code>cpu.stat</code>, <code>memory.stat</code>, <code>*.pressure</code>) or container-aware exporters (cAdvisor) for per-container truth.</p>`,
          interview: 'Know which tool answers which question and how to read CPU states (us/sy/wa/si/st), that Linux load average includes D-state tasks, and why strace is risky in production while perf/eBPF are low overhead. Mentioning PSI and cgroup-level metrics for containers shows modern practice.',
          examples: [
            {
              label: 'perf: CPU profile with kernel + Go stacks',
              lang: 'bash',
              code: `# Sample on-CPU stacks at 99 Hz across all CPUs for 30 s
$ sudo perf record -F 99 -a -g -- sleep 30
$ sudo perf report --stdio --sort comm,dso | head -20
# Overhead  Command  Shared Object
    41.22%  api      api                    # Go code (frame pointers on amd64/arm64 give good stacks)
    23.87%  api      [kernel.kallsyms]      # syscalls, network stack, page faults
     9.10%  api      libc.so.6              # cgo?

# Off-CPU / scheduler latency with eBPF (BCC):
$ sudo runqlat-bpfcc 10 1        # histogram of time spent waiting in run queues
$ sudo biolatency-bpfcc 10 1     # block I/O latency histogram
$ sudo offcputime-bpfcc -p $(pgrep api) 30 > offcpu.stacks   # where threads block`
            }
          ]
        },
        {
          title: 'Profiling Go Services & Reading Flame Graphs',
          def: `<p><strong>Sampling profilers</strong> interrupt the program periodically (Go's CPU profiler: 100 Hz via <code>SIGPROF</code>) and record the stack; hot code appears in proportion to the CPU it uses, with low overhead (a few %). Go's built-in profiles via <code>net/http/pprof</code> (serve on an internal port only):</p>
<table><thead><tr><th>Profile</th><th>Answers</th></tr></thead><tbody>
<tr><td><code>profile</code> (CPU)</td><td>Where is CPU time spent?</td></tr>
<tr><td><code>heap</code> (inuse_space / alloc_space)</td><td>What holds memory now? What allocates the most (GC pressure)?</td></tr>
<tr><td><code>goroutine</code></td><td>What are all goroutines doing? (leaks, deadlocks)</td></tr>
<tr><td><code>block</code> / <code>mutex</code></td><td>Where do goroutines wait on channels/locks? (enable with <code>SetBlockProfileRate</code> / <code>SetMutexProfileFraction</code>)</td></tr>
<tr><td><code>trace</code></td><td>Timeline: scheduling, GC, syscalls, network blocking, latency of individual requests</td></tr>
</tbody></table>
<p><strong>Flame graphs</strong> (Brendan Gregg): each box is a function; the y-axis is stack depth (callers below callees); the <strong>width</strong> is the share of samples. The x-axis is <em>not</em> time — frames are sorted alphabetically to merge identical stacks. Look for wide boxes, especially wide <em>tops</em> (self time). Variants: <strong>off-CPU</strong> flame graphs (time blocked), <strong>differential</strong> flame graphs (before vs after), and memory/allocation flame graphs.</p>
<p>Typical Go findings: <code>runtime.mallocgc</code> + <code>runtime.gcBgMarkWorker</code> wide → allocation/GC pressure (reduce allocations, reuse buffers, tune GOGC/GOMEMLIMIT); <code>encoding/json</code> reflection; <code>runtime.mapaccess</code>; <code>syscall.Syscall</code> → too many small syscalls; <code>sync.(*Mutex).lockSlow</code> → contention.</p>
<p><strong>Flight recorder</strong> (Go 1.25+): <code>runtime/trace.FlightRecorder</code> keeps the last few seconds of execution trace in a ring buffer at low cost, and you call <code>WriteTo</code> only when something interesting happens (a slow request, a timeout spike), capturing the scheduler/GC/blocking timeline that led up to it.</p>
<p>Production practice: continuous profiling (Pyroscope, Parca, Cloud Profiler) to compare versions, and <strong>PGO</strong> — commit a representative CPU profile as <code>default.pgo</code> and the Go compiler optimises hot paths (typically 2–14% CPU savings).</p>`,
          interview: 'Know the Go profile types and what each answers, how to collect them safely in production (internal pprof endpoint, short durations, continuous profiling), and how to read a flame graph (width = samples, x-axis not time, look at wide tops). Bonus: off-CPU and differential flame graphs, and PGO with default.pgo.',
          examples: [
            {
              label: 'Collect and analyse Go profiles',
              lang: 'bash',
              code: `# In main.go:  import _ "net/http/pprof"
#              go http.ListenAndServe("localhost:6060", nil)   // internal only!

# 30 s CPU profile, interactive web UI with flame graph view
$ go tool pprof -http=:0 'http://localhost:6060/debug/pprof/profile?seconds=30'

# Top consumers in text form
$ go tool pprof -top -nodecount=8 cpu.pprof
      flat  flat%   sum%        cum   cum%
     2.81s 18.73% 18.73%      2.81s 18.73%  runtime.memmove
     1.92s 12.80% 31.53%      5.10s 34.00%  runtime.mallocgc
     1.40s  9.33% 40.87%      6.02s 40.13%  encoding/json.(*decodeState).object
     0.98s  6.53% 47.40%      0.98s  6.53%  runtime.mapaccess2_faststr
     ...
# Allocation hot spots (GC pressure):
$ go tool pprof -sample_index=alloc_space -top http://localhost:6060/debug/pprof/heap
# Compare two versions:
$ go tool pprof -http=:0 -diff_base=old.pprof new.pprof
# Execution trace (scheduler, GC, blocking):
$ curl -o trace.out 'http://localhost:6060/debug/pprof/trace?seconds=5' && go tool trace trace.out`
            }
          ]
        },
        {
          title: 'Benchmarking Pitfalls & Capacity Planning',
          def: `<p><strong>Micro-benchmark pitfalls</strong> (Go <code>testing.B</code>):</p>
<ul><li><strong>Dead-code elimination</strong>: the compiler removes work whose result is unused → impossibly fast results. Use <code>for b.Loop() { ... }</code> (Go 1.24+), which keeps calls alive, or assign results to a package-level sink.</li>
<li><strong>Setup inside the timed region</strong>: use <code>b.ResetTimer()</code> or <code>b.Loop</code> (which times only the loop).</li>
<li><strong>Unrealistic inputs</strong>: tiny data fits in L1; sorted data predicts branches; one key always hits cache.</li>
<li><strong>Noise</strong>: CPU frequency scaling/turbo, thermal throttling, noisy neighbours, background tasks. Run multiple times (<code>-count=10</code>) and compare with <code>benchstat</code>, which reports variance and significance.</li>
<li><strong>Ignoring allocations</strong>: use <code>-benchmem</code>/<code>b.ReportAllocs()</code>; GC cost appears at scale, not in tiny benchmarks.</li></ul>
<p><strong>Load-test pitfalls</strong>: closed-loop generators (coordinated omission), testing from a single client machine that saturates first, cold caches/JIT/pools, unrealistic request mix, ignoring dependencies (the DB is shared in prod), and too-short runs that miss GC cycles, compaction or log rotation.</p>
<p><strong>Capacity planning basics</strong>:</p>
<ol><li><strong>Find per-instance capacity</strong>: ramp a constant-rate load test until the latency SLO breaks (the knee), not until CPU hits 100%. Record the limiting resource.</li>
<li><strong>Forecast demand</strong>: peak (not average) traffic, growth trend, seasonality, launches, retry storms.</li>
<li><strong>Add headroom</strong>: for failure (N+1 instances, losing one AZ of three means the remaining two must carry 150% of their normal load), for deploys (rolling updates remove capacity), for autoscaling lag, and to stay below the queueing knee (~60–70% target utilisation).</li>
<li><strong>Check dependencies</strong>: DB connections (instances × pool size), downstream rate limits, network and disk bandwidth.</li>
<li><strong>Re-validate</strong> regularly: code changes shift per-request cost; track cost per request as a metric.</li></ol>`,
          interview: 'List concrete benchmarking traps (dead-code elimination, setup in timed region, unrealistic data, noise, coordinated omission) and the Go fixes (b.Loop, ResetTimer, -count + benchstat, -benchmem). For capacity planning, walk through knee-finding at the SLO, peak forecasting, AZ-failure headroom and dependency limits with numbers.',
          examples: [
            {
              label: 'A correct Go benchmark compared with benchstat',
              lang: 'go',
              code: `func BenchmarkParseOrder(b *testing.B) {
    payload := loadFixture(b, "testdata/order_2kb.json") // realistic input, outside the loop
    b.ReportAllocs()
    for b.Loop() { // Go 1.24+: setup excluded, results kept alive (no dead-code elimination)
        if _, err := ParseOrder(payload); err != nil {
            b.Fatal(err)
        }
    }
}

// $ go test -run '^$' -bench ParseOrder -benchmem -count 10 > old.txt
// ... change the code ...
// $ go test -run '^$' -bench ParseOrder -benchmem -count 10 > new.txt
// $ benchstat old.txt new.txt
//                │   old.txt   │              new.txt               │
//                │   sec/op    │   sec/op     vs base               │
// ParseOrder-16    1.912µ ± 2%   1.403µ ± 1%  -26.62% (p=0.000 n=10)
//                │    B/op     │    B/op      vs base               │
// ParseOrder-16    1.344Ki ± 0%  0.531Ki ± 0%  -60.47% (p=0.000 n=10)`
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Apply Little\'s law to find required concurrency',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>L = λ × W.</li><li>Service: 3,000 req/s, average latency 80 ms. How many requests are in flight?</li><li>Each request holds a DB connection for 15 ms. How many connections are busy on average?</li></ul>`,
          solution: `In flight: L = 3000 * 0.080 = 240 concurrent requests.
DB connections busy: 3000 * 0.015 = 45 on average.

Headroom: averages hide bursts. Size the pool for p99 concurrency, e.g.
45 * 1.5-2 = 70-90, while checking the database's total connection limit
(instances * pool size must stay below max_connections).

If latency doubles to 160 ms at the same rate (e.g. a slow dependency),
in-flight requests double to 480 -- goroutines, memory and connections all
double. Latency spikes therefore cause memory and pool exhaustion: set
timeouts and bound concurrency.`,
          lang: 'text'
        },
        {
          t: 'Explain why average latency is misleading and compute the fan-out tail',
          d: 'easy',
          type: 'concept',
          hint: `<ul><li>Example distribution: 99% of requests take 10 ms, 1% take 1 s. Mean? p50? p99?</li><li>A page calls 50 such backends in parallel. What fraction of page loads sees at least one 1 s call?</li></ul>`,
          solution: `Mean = 0.99*10 + 0.01*1000 = 9.9 + 10 = 19.9 ms
p50 = 10 ms, p99 = 10 ms (boundary) / p99.5 = 1000 ms
The mean (19.9 ms) describes no actual request: twice the typical, 50x
less than the slow ones.

Fan-out to 50 backends: P(no slow call) = 0.99^50 = 0.605
=> ~39.5% of page loads take >= 1 s.
With 100 backends: 1 - 0.99^100 = 63.4%.

Lessons: track high percentiles per dependency; tail latency of a backend
becomes the median latency of a fan-out frontend. Mitigate with hedged
requests, tighter per-call timeouts, fewer fan-out calls, and fixing the
cause of the 1% (GC, cold cache, retransmits).`,
          lang: 'text'
        },
        {
          t: 'Predict latency as utilisation rises',
          d: 'medium',
          type: 'concept',
          hint: `<ul><li>M/M/1: <code>W = S / (1 − ρ)</code>, waiting time <code>Wq = ρS / (1 − ρ)</code>.</li><li>A single-threaded component has S = 2 ms. Traffic grows from 250 to 400 to 475 req/s. Compute ρ and W.</li><li>What happens at 500 and at 550 req/s?</li></ul>`,
          solution: `Capacity mu = 1/S = 500 req/s.

lambda = 250 -> rho = 0.50 -> W = 2/(0.5)  = 4 ms
lambda = 400 -> rho = 0.80 -> W = 2/(0.2)  = 10 ms
lambda = 475 -> rho = 0.95 -> W = 2/(0.05) = 40 ms
lambda = 500 -> rho = 1.00 -> W -> infinity (queue grows without bound)
lambda = 550 -> overloaded: queue grows by 50 req/s forever; with an
unbounded queue, latency rises every second until timeouts/OOM.

Traffic grew 1.9x (250 -> 475) but latency grew 10x. Takeaways:
- plan for ~60-70% utilisation of the bottleneck resource;
- add parallelism (M/M/c) or reduce S to move the knee;
- bound queues and shed load beyond capacity (HTTP 503/429), so
  latency for admitted requests stays sane.`,
          lang: 'text'
        },
        {
          t: 'Run a USE-method investigation on a slow Linux host',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Create load: <code>stress-ng --cpu 8</code>, <code>--vm 2 --vm-bytes 80%</code>, <code>--hdd 2</code> or <code>fio</code>, one at a time.</li><li>For each: identify which U/S/E metric changes, with which command.</li><li>Write a one-line conclusion per resource, as you would in an incident channel.</li></ul>`,
          solution: `Scenario A: stress-ng --cpu 16 on an 8-CPU VM
  vmstat 1     -> r ~16 (> 8 CPUs) => CPU SATURATION; us ~98, id 0
  mpstat       -> all CPUs ~100%   => CPU UTILISATION 100%
  cat /proc/pressure/cpu -> some avg10 ~50
  Conclusion: "CPU saturated by stress-ng (pidstat), run queue 2x cores."

Scenario B: stress-ng --vm 2 --vm-bytes 95%
  free -m      -> available near 0
  vmstat 1     -> si/so > 0, b > 0, wa up => MEMORY SATURATION (swapping)
  dmesg -T     -> "Out of memory: Killed process ..." => MEMORY ERRORS
  Conclusion: "Memory exhausted; swapping then OOM kill of stress-ng."

Scenario C: fio --rw=randwrite --bs=4k --iodepth=64 --direct=1
  iostat -xz 1 -> %util 100, aqu-sz 60, w_await 25 ms => DISK SATURATION
  cat /proc/pressure/io -> full > 0
  Conclusion: "nvme0n1 saturated by fio random writes; await 25 ms."

Errors everywhere: dmesg, ip -s link (rx errors/drops), nstat TcpRetransSegs.
Then drill into the culprit process with pidstat/perf/pprof.`,
          lang: 'text'
        },
        {
          t: 'Profile a Go service and fix its top hotspot',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul><li>Expose <code>net/http/pprof</code> on localhost, generate load, capture a 30 s CPU profile.</li><li>Open the flame graph (<code>go tool pprof -http</code>), find the widest frames under your handlers.</li><li>Common fixes: avoid repeated allocations, precompile regexps, reuse buffers, avoid reflection-heavy encoding in hot paths.</li><li>Verify with a benchmark and benchstat.</li></ul>`,
          solution: `package main

import (
    "net/http"
    _ "net/http/pprof" // registers /debug/pprof/* on DefaultServeMux
    "regexp"
)

// BEFORE (hotspot found in the flame graph: regexp.Compile under the handler)
func validHandlerSlow(w http.ResponseWriter, r *http.Request) {
    re := regexp.MustCompile(\`^[a-z0-9-]{3,64}$\`) // compiled on EVERY request
    if !re.MatchString(r.URL.Query().Get("slug")) {
        http.Error(w, "bad slug", http.StatusBadRequest)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

// AFTER: compile once
var slugRE = regexp.MustCompile(\`^[a-z0-9-]{3,64}$\`)

func validHandler(w http.ResponseWriter, r *http.Request) {
    if !slugRE.MatchString(r.URL.Query().Get("slug")) {
        http.Error(w, "bad slug", http.StatusBadRequest)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

func main() {
    go http.ListenAndServe("localhost:6060", nil) // pprof, internal only
    mux := http.NewServeMux()
    mux.HandleFunc("GET /valid", validHandler)
    http.ListenAndServe(":8080", mux)
}

// Workflow:
// 1. hey/vegeta load on :8080
// 2. go tool pprof -http=:0 'http://localhost:6060/debug/pprof/profile?seconds=30'
//    -> flame graph: regexp.compile + mallocgc ~45% under validHandlerSlow
// 3. Fix, re-run benchmark (-count 10) and benchstat: -90% ns/op, -95% allocs
// 4. Re-profile under load to find the NEXT hotspot (it moves).`,
          lang: 'go'
        },
        {
          t: 'Fix a misleading Go benchmark',
          d: 'medium',
          type: 'debug',
          hint: `<ul><li>The benchmark reports 0.3 ns/op for a hash function — faster than a single memory load.</li><li>Look for: unused results, setup inside the loop, constant inputs the compiler can fold, single run.</li><li>Use <code>b.Loop</code>, realistic inputs, <code>-benchmem</code>, <code>-count</code> and <code>benchstat</code>.</li></ul>`,
          solution: `// BROKEN
func BenchmarkHash(b *testing.B) {
    for i := 0; i < b.N; i++ {
        data := make([]byte, 1024) // setup timed on every iteration
        Hash(data)                 // result unused -> may be optimised away
    }
}
// 0.3 ns/op: Hash was inlined and eliminated; the measurement is meaningless.

// FIXED (Go 1.24+)
func BenchmarkHash(b *testing.B) {
    for _, size := range []int{64, 1 << 10, 64 << 10} { // several realistic sizes
        data := make([]byte, size)
        for i := range data { // deterministic, non-constant input
            data[i] = byte(i*131 + 7)
        }
        b.Run(fmt.Sprintf("size=%d", size), func(b *testing.B) {
            b.SetBytes(int64(size)) // reports MB/s
            b.ReportAllocs()
            for b.Loop() { // keeps Hash's arguments/results alive; setup not timed
                Hash(data)
            }
        })
    }
}

// Pre-1.24 equivalent: var sink uint64; b.ResetTimer(); for i := 0; i < b.N; i++ { sink = Hash(data) }
// Run: go test -run '^$' -bench Hash -count 10 | tee new.txt; benchstat old.txt new.txt
// Also: pin CPU frequency / quiet machine, compare on the same hardware,
// and confirm with a profile that the benchmark exercises the real code path.`,
          lang: 'go'
        },
        {
          t: 'Size a database connection pool',
          d: 'medium',
          type: 'design',
          hint: `<ul><li>Use Little's law with the time a connection is <em>held</em>, not the request latency.</li><li>Inputs: 30 instances, 1,200 req/s total peak, 2 queries per request, 6 ms per query at p50, 20 ms at p99; Postgres <code>max_connections</code> = 500.</li><li>What happens when the DB slows down? Why is a bigger pool not always better?</li></ul>`,
          solution: `Total query rate: 1200 * 2 = 2400 queries/s.
Average busy connections (fleet): 2400 * 0.006 = 14.4
At p99 service time:             2400 * 0.020 = 48
Per instance (30 instances):     ~0.5 average, ~1.6 at p99 -> bursts matter.

Plan: MaxOpenConns = 5 per instance (150 total, under 500 with room for
deploys doubling instances during rollout: 300), MaxIdleConns = 5,
ConnMaxLifetime ~30 min, and a context timeout on every query (e.g. 200 ms).

Why not 50 per instance? The database has finite CPU/disk; more concurrent
queries beyond its cores increase its latency (queueing inside the DB, lock
contention) and can collapse throughput. A small pool queues requests in
the app, where you can time out and shed load.

When the DB slows (6 -> 60 ms), busy connections jump 10x (L = lambda W):
pools saturate, requests wait in db.Conn(), latency spikes. Detect with
sql.DBStats (WaitCount, WaitDuration, InUse) and alert on wait time.`,
          lang: 'text'
        },
        {
          t: 'Diagnose high p99 latency while CPU utilisation is low',
          d: 'hard',
          type: 'debug',
          hint: `<ul><li>CPU 25%, p50 8 ms, p99 400 ms. On-CPU profiles look "normal" — the time is spent <em>off</em> CPU.</li><li>Candidates: lock contention, pool waits, GC assists/STW, CFS throttling, slow dependency, DNS, TCP retransmits, disk fsync, run-queue latency.</li><li>Tools: Go block/mutex profiles, execution trace, <code>cpu.stat</code> throttling, <code>offcputime</code>/<code>runqlat</code>, <code>nstat</code>, per-dependency latency histograms.</li></ul>`,
          solution: `Approach: find where the slow requests WAIT, not where CPU burns.

1. Request-level: distributed traces of p99 requests -> which span is slow?
   e.g. "inventory.Get" 380 ms but the inventory service reports p99 20 ms
   -> time is lost between them (client side).
2. Go runtime:
   - runtime/trace of a 5 s window: goroutines in "sync block" or
     "network wait"? GC STW/assist bars?
   - /debug/pprof/mutex and /block (enable SetMutexProfileFraction(5),
     SetBlockProfileRate(10000)) -> 70% of blocking in http.Transport
     getConn: waiting for a connection to inventory.
3. Cause: http.Transport.MaxConnsPerHost = 10 caps concurrency; by Little's
   law the service needs ~40 concurrent calls at peak -> requests queue for a
   connection (pool saturation), invisible to CPU profiles.
4. Other common findings in the same pattern:
   - cgroup cpu.stat nr_throttled high -> CFS quota throttling;
   - runqlat shows ms-level run-queue waits -> CPU oversubscription;
   - nstat TcpRetransSegs rising -> packet loss (200 ms+ RTO on retransmit);
   - DNS lookups without caching; fsync on request path.
5. Fix: raise MaxConnsPerHost/MaxIdleConnsPerHost to measured need, add
   per-call timeouts, and export pool wait metrics. Verify p99 drops.`,
          lang: 'text'
        },
        {
          t: 'Find a CPU regression between two releases',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul><li>Release v2 uses 30% more CPU at the same traffic. You have continuous profiles (or can capture one per version under the same load).</li><li>Use <code>go tool pprof -diff_base</code> and a differential flame graph; normalise by request count.</li><li>Confirm with targeted benchmarks and benchstat; consider PGO profiles being stale.</li></ul>`,
          solution: `1. Normalise: compare CPU-seconds per 1k requests, not absolute CPU,
   under similar traffic mix (same hour of day, same endpoint split).
2. Capture comparable profiles:
   curl -o v1.pprof 'http://v1-pod:6060/debug/pprof/profile?seconds=60'
   curl -o v2.pprof 'http://v2-pod:6060/debug/pprof/profile?seconds=60'
3. Diff:
   go tool pprof -http=:0 -diff_base=v1.pprof v2.pprof
   -> red (grew) frames: encoding/json.Marshal +18%, runtime.mallocgc +9%
      under handlers.ListOrders.
4. Root-cause in code review of the diff: v2 switched the response type from
   a struct to map[string]any to add dynamic fields -> reflection-heavy
   marshalling and many more allocations.
5. Reproduce in a benchmark (BenchmarkListOrders with a realistic payload),
   then fix (typed struct with omitempty / a pre-sized encoder) and prove it:
   benchstat v1.txt v2.txt fixed.txt.
6. Prevent: CI benchmark gate on hot paths (benchstat significance), CPU per
   request dashboard, and refresh default.pgo from current production
   profiles so PGO tracks the new hot paths.`,
          lang: 'text'
        },
        {
          t: 'Capacity plan a service for a 4x traffic peak',
          d: 'hard',
          type: 'design',
          hint: `<ul><li>Current: 6,000 req/s peak on 12 pods (3 AZs). Load test shows one pod meets the p99 SLO up to 900 req/s (CPU-bound); beyond that latency knees.</li><li>Expected event peak: 4× current. Plan pods, AZ-failure headroom, autoscaling, and dependency limits (DB 2,000 connections, downstream rate limit 30K req/s).</li><li>What would you load-test before the event?</li></ul>`,
          solution: `Demand: 4 * 6000 = 24,000 req/s peak (+10% safety for retries) = 26,400.

Per-pod capacity at SLO: 900 req/s. Target 70% of that in steady state to
stay left of the knee: 630 req/s per pod.
Pods for steady state: 26,400 / 630 = 42 pods.

AZ failure (3 AZs): if one AZ fails, the remaining 2/3 must carry the load
at <= 900 req/s per pod: pods_needed = 26,400 / 900 = 29.3 -> 30 surviving
pods -> 45 pods total (15 per AZ). Take max(42, 45) = 45 pods, pre-scaled
(autoscaling reacts in minutes; peaks ramp in seconds).

Dependencies:
- DB: 45 pods * pool 20 = 900 connections (< 2,000) -- but check DB CPU at
  4x query rate; may need read replicas or caching.
- Downstream: 26,400 req/s * 1 call = 26,400 < 30,000 limit: only 12%
  headroom -> negotiate a higher limit or add caching/coalescing.
- Node capacity: 45 pods * requests (e.g. 2 CPU) = 90 CPUs + daemonsets;
  ensure cluster autoscaler / reserved capacity exists.

Validation before the event:
- Constant-rate load test at 26.4k req/s across the stack (prod-like data),
  then 120% to find the breaking point, plus an AZ-failure drill.
- Verify graceful degradation: load shedding (429/503) beyond capacity,
  timeouts and circuit breakers on dependencies, feature flags to disable
  expensive features.
- Dashboards: RED per endpoint, USE per resource, saturation alerts.`,
          lang: 'text'
        }
      ],
      interviewFocus: [
        {
          q: 'Explain Little\'s law and give three ways you\'ve used (or would use) it.',
          a: `<p><code>L = λW</code>: average items in a system = arrival rate × average time each spends there. It needs only stability (arrivals ≈ departures over the window), not any distribution assumption, and applies to any boundary you draw.</p>
<ul><li><strong>Concurrency sizing</strong>: 5,000 req/s × 40 ms = 200 in-flight requests → goroutines, memory per request × 200, worker pool sizes.</li>
<li><strong>Connection pools</strong>: 3,000 queries/s × 5 ms hold time = 15 busy connections on average; size for bursts and check DB limits across all instances.</li>
<li><strong>Queues and lag</strong>: a queue with 50,000 messages drained at a net 500 msgs/s has a 100 s wait; to keep queueing time under 1 s at 2,000 msgs/s, the queue must stay below 2,000 items.</li>
<li><strong>Diagnosis</strong>: if in-flight requests climb while arrival rate is flat, W (latency) has increased — something downstream slowed.</li></ul>
<p>Corollary for resilience: when a dependency slows down, in-flight work (and memory, goroutines, connections) grows proportionally — so timeouts and concurrency limits are essential.</p>`
        },
        {
          q: 'Why does latency explode as utilisation approaches 100%?',
          a: `<p>Because of queueing. With random arrivals, work sometimes arrives faster than it can be served; the excess waits. The closer average utilisation is to 100%, the less spare capacity exists to drain those transient queues. For M/M/1, <code>W = S/(1 − ρ)</code>: 50% → 2×, 80% → 5×, 90% → 10×, 99% → 100× the service time.</p>
<ul><li><strong>Variability</strong> (bursty traffic, variable service times like GC pauses or cache misses) makes queues worse (Kingman's formula: waiting ∝ variability × ρ/(1−ρ)).</li>
<li><strong>Multiple servers</strong> (cores, pods) let you run hotter for the same latency, but the knee still exists.</li>
<li><strong>Beyond 100%</strong>, an unbounded queue grows without limit: latency → ∞, memory → OOM.</li></ul>
<p>Practical consequences: target ~60–70% utilisation on bottleneck resources (CPU, DB, disks), scale on latency/saturation not just CPU, bound queues, apply backpressure and shed load early (429/503), and reduce variability (smaller GC pauses, timeouts, isolation of slow requests).</p>`
        },
        {
          q: 'A production server is slow. How do you investigate methodically?',
          a: `<ol><li><strong>Clarify the problem</strong>: what is slow (endpoint, percentile), since when, what changed (deploys, traffic, config, dependencies)? Check RED dashboards and traces to localise to a service/instance.</li>
<li><strong>USE method on the host/container</strong>: CPU (<code>mpstat</code>, run queue, throttling), memory (<code>free</code>, swapping, OOM, PSI), disk (<code>iostat -x</code> await/aqu-sz), network (<code>sar -n DEV/ETCP</code>, retransmits, drops), software resources (pools, fds, locks). Check errors in <code>dmesg</code>.</li>
<li><strong>Drill into the saturated resource</strong>: on-CPU → <code>perf</code>/pprof flame graphs; off-CPU → block/mutex profiles, execution trace, <code>offcputime</code>; I/O → <code>biolatency</code>, which process/file; network → <code>ss</code>, <code>tcpretrans</code>.</li>
<li><strong>Form and test a hypothesis</strong>: reproduce under load, change one thing, measure.</li>
<li><strong>Fix and verify</strong>: compare the same metrics before/after; add alerting on the saturation signal that would have caught it earlier.</li></ol>
<p>Anti-patterns to name: "streetlight" debugging (only tools you know), random config changes, trusting averages, and assuming 100% CPU means "need more CPUs" (could be spin/lock contention or low IPC).</p>`
        },
        {
          q: 'How do you profile a Go service in production safely?',
          a: `<ul><li><strong>Expose pprof internally</strong>: <code>import _ "net/http/pprof"</code> on a separate localhost/admin port (never on the public mux); access via port-forward or an authenticated admin path.</li>
<li><strong>CPU profile</strong> (<code>/debug/pprof/profile?seconds=30</code>): ~100 Hz sampling, low single-digit % overhead during collection. Read with <code>go tool pprof -http</code> flame graphs; look at wide frames and <code>mallocgc</code>/GC share.</li>
<li><strong>Heap</strong>: <code>inuse_space</code> for leaks/retention, <code>alloc_space</code>/<code>alloc_objects</code> for GC pressure.</li>
<li><strong>Goroutine</strong>: counts and stacks for leaks and stuck requests (<code>?debug=2</code>).</li>
<li><strong>Block/mutex</strong>: enable at a low sampling rate (<code>SetMutexProfileFraction</code>, <code>SetBlockProfileRate</code>) to find contention and waiting — the "off-CPU" view.</li>
<li><strong>Execution trace</strong>: short windows (1–5 s) for scheduling latency, GC pauses, syscalls; Go 1.21 cut tracing overhead to ~1–2%, and Go 1.25 added <code>runtime/trace.FlightRecorder</code> to keep the last few seconds in memory and dump them only when a slow request is detected.</li>
<li><strong>Continuous profiling</strong> (Pyroscope, Parca, Cloud Profiler) to compare versions and catch regressions; feed a representative profile back as <code>default.pgo</code>.</li>
<li>Complement with <code>perf</code> for kernel time and hardware counters (IPC, cache misses).</li></ul>`
        }
      ],
      quiz: [
        { q: 'State Little\'s law.', a: 'L = lambda x W: the average number of items in a system equals the arrival rate times the average time each item spends in the system.' },
        { q: 'For an M/M/1 queue at 90% utilisation, how does response time compare to service time?', a: 'About 10x (W = S / (1 - rho)).' },
        { q: 'What does USE stand for?', a: 'Utilisation, Saturation and Errors, checked for every resource.' },
        { q: 'What does RED stand for?', a: 'Rate, Errors and Duration, measured per service endpoint.' },
        { q: 'In a flame graph, what does the width of a frame mean?', a: 'The proportion of samples in which that function was on the stack; the x-axis is not time.' },
        { q: 'What is coordinated omission?', a: 'A load-testing error where a closed-loop client stops sending while the server stalls, so the slowest latencies are under-recorded.' },
        { q: 'Why can Linux load average be high while CPUs are idle?', a: 'Linux load average also counts tasks in uninterruptible sleep (D state), typically waiting on disk or NFS I/O.' },
        { q: 'Which Go 1.24 API makes benchmarks resistant to dead-code elimination?', a: 'testing.B.Loop (for b.Loop() { ... }), which keeps arguments and results alive and excludes setup from timing.' }
      ],
      resources: [
        { title: 'Brendan Gregg — The USE Method', url: 'https://www.brendangregg.com/usemethod.html', type: 'article' },
        { title: 'Brendan Gregg — Flame Graphs', url: 'https://www.brendangregg.com/flamegraphs.html', type: 'article' },
        { title: 'Brendan Gregg — Linux Performance', url: 'https://www.brendangregg.com/linuxperf.html', type: 'article' },
        { title: 'Go Diagnostics', url: 'https://go.dev/doc/diagnostics', type: 'docs' }
      ]
    }
  ],
  flashcards: [
    { q: 'What is two\'s complement negation of x?', a: 'Invert all bits and add 1: -x == ^x + 1.', d: 1 },
    { q: 'Does Go panic on integer overflow at run time?', a: 'No. Integer overflow wraps silently (defined behaviour); only constant overflow is a compile error and integer division by zero panics.', d: 1 },
    { q: 'Why is 0.1 + 0.2 != 0.3 for float64 variables?', a: '0.1, 0.2 and 0.3 have no exact binary representation; the rounded sum is 0.30000000000000004, a different double than 0.3.', d: 1 },
    { q: 'Largest integer range a float64 represents exactly?', a: 'All integers up to 2^53 (9,007,199,254,740,992); larger int64 values (e.g. IDs) lose precision in JSON/JavaScript.', d: 2 },
    { q: 'Byte order of x86-64 vs network protocols?', a: 'x86-64 and ARM64 (as normally run) are little-endian; network byte order is big-endian. Use encoding/binary in Go.', d: 1 },
    { q: 'Iron law of processor performance?', a: 'CPU time = instructions x CPI x clock period. Low IPC usually means stalls on memory or branch mispredicts.', d: 2 },
    { q: 'Why is processing sorted data often faster?', a: 'Branches on the data become predictable, avoiding ~15-20 cycle pipeline flushes from mispredictions (unless the compiler already emitted a branchless CMOV).', d: 2 },
    { q: 'Amdahl\'s law formula and limit?', a: 'Speedup = 1 / ((1-p) + p/n); the limit as n grows is 1/(1-p), e.g. 20x for 95% parallel code.', d: 2 },
    { q: 'Approximate latencies: L1, L2, L3, DRAM?', a: 'About 1 ns, 4 ns, 15 ns and 100 ns respectively (NVMe ~100 us, same-DC RTT ~0.5 ms).', d: 1 },
    { q: 'Cache line size on x86-64?', a: '64 bytes; caches transfer and keep coherence in whole lines.', d: 1 },
    { q: 'What is false sharing and the Go fix?', a: 'Cores writing different variables on the same cache line cause it to ping-pong between caches. Pad hot per-goroutine fields to separate lines (e.g. 64-128 bytes) or accumulate locally.', d: 2 },
    { q: 'MESI states?', a: 'Modified (dirty, only copy), Exclusive (clean, only copy), Shared (clean, possibly in other caches), Invalid.', d: 2 },
    { q: 'AoS vs SoA in one line?', a: 'Array-of-structs suits per-record access; struct-of-arrays suits scanning a few fields over many records (fewer cache lines, SIMD-friendly, like columnar DBs).', d: 2 },
    { q: 'What does the TLB do and what improves TLB reach?', a: 'It caches virtual-to-physical translations; huge pages (2 MiB/1 GiB) cover far more memory per entry.', d: 2 },
    { q: 'Minor vs major page fault?', a: 'Minor: resolved in memory (zero page, page cache hit, COW copy). Major: requires disk I/O (file data or swap).', d: 2 },
    { q: 'How does fork() avoid copying the whole address space?', a: 'Copy-on-write: parent and child share pages read-only; a page is copied only when one of them writes to it. Page tables are still copied.', d: 2 },
    { q: 'Exit code 137 in Kubernetes means?', a: 'The process was killed by SIGKILL (128+9), usually the OOM killer after exceeding memory.max (OOMKilled).', d: 1 },
    { q: 'What does GOMEMLIMIT do?', a: 'Gives the Go runtime a soft memory limit so the GC collects more aggressively as total Go memory approaches it; set ~90% of the container limit.', d: 2 },
    { q: 'Process vs thread vs goroutine, in one line each?', a: 'Process: own address space and resources. Thread: kernel-scheduled flow sharing its process memory. Goroutine: runtime-scheduled, ~2 KiB growable stack, multiplexed M:N onto threads.', d: 1 },
    { q: 'What are G, M and P?', a: 'Goroutine, Machine (OS thread) and Processor (scheduling context with a local run queue); GOMAXPROCS sets the number of Ps.', d: 2 },
    { q: 'What happens when a goroutine makes a long blocking syscall?', a: 'Its OS thread blocks; sysmon retakes the P and hands it to another thread so other goroutines keep running.', d: 3 },
    { q: 'Which Linux scheduler replaced CFS in 6.6?', a: 'EEVDF (Earliest Eligible Virtual Deadline First), which keeps proportional fairness but picks by virtual deadline for better latency.', d: 3 },
    { q: 'Four Coffman conditions for deadlock?', a: 'Mutual exclusion, hold and wait, no preemption, circular wait. Lock ordering breaks circular wait.', d: 1 },
    { q: 'What is the ABA problem?', a: 'A CAS succeeds because a value changed A -> B -> A, hiding an intervening modification; fixed with version tags, hazard pointers, epochs or GC.', d: 3 },
    { q: 'What ordering do Go atomics provide?', a: 'Sequential consistency; atomic operations create happens-before edges, so race-free Go programs behave sequentially consistently.', d: 3 },
    { q: 'Why wait on a condition variable in a for loop?', a: 'Wakeups can be spurious and the predicate may be false again by the time the lock is reacquired.', d: 2 },
    { q: 'How does epoll scale better than select/poll?', a: 'The interest set lives in the kernel (red-black tree) and ready fds are pushed to a ready list by callbacks, so epoll_wait costs O(ready) instead of O(all fds).', d: 2 },
    { q: 'Edge-triggered epoll rule?', a: 'After an event, read/write until EAGAIN; otherwise data already buffered may never be reported again.', d: 3 },
    { q: 'Is data durable after write() returns?', a: 'No, it is only in the page cache. Call fsync/fdatasync (Go: File.Sync) and fsync the directory for new or renamed files.', d: 2 },
    { q: 'Little\'s law and the utilisation-latency rule of thumb?', a: 'L = lambda x W. For a single queue W = S / (1 - utilisation): 80% busy means ~5x service time, so target ~60-70% on bottlenecks.', d: 2 },
    { q: 'How many L1 dTLB entries do 2 MiB pages typically get on Intel cores?', a: 'A separate small array of about 32 entries (about 64 MiB of reach); the large shared STLB (1.5K-4K entries) is what gives huge pages gigabytes of reach. AMD Zen 4/5 share one 72-96 entry L1 array across page sizes.', d: 3 },
    { q: 'How does EEVDF choose the next task?', a: 'Among eligible tasks (lag >= 0, not ahead of their fair share) it runs the one with the earliest virtual deadline; a short requested slice means an earlier deadline, not more CPU.', d: 3 },
    { q: 'What is sched_ext?', a: 'A Linux 6.12+ scheduler class whose policy is a BPF program loaded at run time; if it misbehaves the kernel falls back to the fair (EEVDF) class.', d: 2 },
    { q: 'What does memory.oom.group = 1 do?', a: 'On an OOM kill in that cgroup, all its processes are killed together instead of one victim; the kubelet sets it for containers on cgroup v2 since Kubernetes 1.28.', d: 3 },
    { q: 'Why does Go send SIGURG to its own threads?', a: 'For asynchronous preemption (Go 1.14+): the handler stops a goroutine that has run too long so the scheduler and GC can proceed.', d: 2 },
    { q: 'Go allocator fast path in one line?', a: 'Each P has an mcache with a span per size class, so small allocations need no lock; spans are refilled from mcentral, which refills from mheap arenas obtained with mmap.', d: 3 },
    { q: 'When are a deleted file\'s blocks freed?', a: 'When its link count is 0 and no process still has it open; until then df counts the space (find such files with lsof +L1).', d: 2 },
    { q: 'What is a VM exit, and what does EPT change?', a: 'A VM exit is a trap from guest mode into the hypervisor on a sensitive event; EPT/NPT lets hardware translate guest-physical to host-physical, avoiding exits for page-table changes but making TLB misses walk two levels of tables.', d: 3 }
  ]
});
