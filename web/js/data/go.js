// Go Engineering roadmap — core weeks, cloud-native weeks, company tracks, LeetCode, flashcards.
// Schema: see CONTRIBUTING.md. Progress ids use the legacy "w{week}_{kind}_{i}" scheme (idPrefix 'w').
registerRoadmap({
 "id": "go",
 "order": 10,
 "title": "Go Engineering",
 "short": "Go",
 "icon": "🐹",
 "color": "#00ADD8",
 "desc": "Go from fundamentals to cloud-native services: concurrency, networking, security, Kubernetes, runtime internals and design.",
 "unit": "Week",
 "idPrefix": "w",
 "modules": [
  {
   "n": 1,
   "title": "Language Fundamentals & Environment Setup",
   "group": "Core Go (Weeks 1–8)",
   "topics": [
    {
     "title": "Go installation, GOPATH vs Go modules, workspace structure",
     "def": "Go modules are the <strong>standard dependency management system</strong> since Go 1.11 (fully adopted in Go 1.16), replacing the legacy GOPATH approach. Each project contains a <code>go.mod</code> file that defines: the module name (import path), the Go version, and direct dependencies with their pinned versions.<br><br><strong>Dependency resolution:</strong> When you import a package and run <code>go build</code>, <code>go test</code>, or <code>go mod tidy</code>, Go automatically resolves and downloads required dependencies along with their transitive dependencies. Dependencies are cached locally in the <strong>module cache</strong> (<code>$GOPATH/pkg/mod</code>), enabling reuse across projects without re-downloading.<br><br><strong>go.sum file:</strong> Generated automatically, this file stores <strong>cryptographic checksums</strong> (SHA-256 hashes) for every downloaded dependency. This ensures dependency integrity and protects against tampered or corrupted modules, making builds <strong>reproducible</strong> — the same code will always build with the exact same dependency versions across machines and time.<br><br><strong>Semantic Versioning:</strong> Go follows SemVer. For major versions v2 and higher, the version is <strong>included in the import path</strong> (e.g., <code>github.com/user/pkg/v2</code>). This allows multiple major versions of the same library to coexist without conflicts — you can import both <code>pkg</code> (v1) and <code>pkg/v2</code> in the same project.<br><br><strong>Vendoring:</strong> For enterprise environments or air-gapped systems, <code>go mod vendor</code> copies all dependencies into the project's <code>vendor/</code> directory. Builds with <code>-mod=vendor</code> use the local vendor directory instead of the module cache, ensuring builds don't rely on external repositories.<br><br><strong>The <code>go</code> and <code>toolchain</code> lines (Go 1.21+):</strong> <code>go 1.26</code> in go.mod is a <em>minimum requirement</em>, not a hint: it sets the language version for the module (loop-variable semantics, generic methods in 1.27, and so on) and selects GODEBUG defaults. If your installed toolchain is older, the go command downloads the required toolchain automatically (<code>GOTOOLCHAIN=auto</code>); an optional <code>toolchain go1.26.2</code> line pins a preferred toolchain for builds of this module.<br><br><strong>Tool dependencies (Go 1.24+):</strong> <code>go get -tool golang.org/x/tools/cmd/stringer</code> records a <code>tool</code> directive in go.mod; run it with <code>go tool stringer</code>. This replaces the old <code>tools.go</code> blank-import hack and pins linters and generators to the module's versions.<br><br><strong>Proxies and private modules:</strong> downloads go through <code>GOPROXY</code> (default <code>proxy.golang.org</code>) and are checked against the checksum database <code>sum.golang.org</code>. Set <code>GOPRIVATE=github.com/yourorg/*</code> so private modules skip both. <strong>Workspaces</strong> (<code>go.work</code>, Go 1.18) let you develop several modules together without <code>replace</code> directives.<br><br><strong>Key commands:</strong> <code>go mod init</code> (initialize), <code>go mod tidy</code> (add/remove dependencies), <code>go get</code> (add/update), <code>go mod vendor</code> (vendor dependencies), <code>go list -m all</code> (build list), <code>go mod why -m</code> (why a module is needed).",
     "interview": "'GOPATH vs modules?' — GOPATH: legacy, single workspace, version conflicts. Modules: modern, per-project, versioned dependencies, reproducible builds. 'go.sum purpose?' — Stores cryptographic checksums for dependencies, ensures integrity and reproducibility. 'Why v2 in import path?' — SemVer: major versions v2+ include version in path to allow coexistence of multiple major versions. 'When to vendor?' — Air-gapped systems, enterprise environments, need offline builds. 'What does the go line in go.mod mean?' — A minimum Go version: it sets language semantics and GODEBUG defaults, and an older toolchain auto-downloads the required one (GOTOOLCHAIN). 'How do you pin linters/generators?' — Go 1.24 tool directives: go get -tool, then go tool <name>.",
     "examples": [
      {
       "label": "Initialize module",
       "lang": "bash",
       "code": "go mod init github.com/user/project\n# Creates go.mod with module path and Go version"
      },
      {
       "label": "Add dependency",
       "lang": "bash",
       "code": "go get golang.org/x/sync@latest      # add or upgrade a dependency\ngo get golang.org/x/sync@v0.12.0     # pin an exact version\ngo get -tool golang.org/x/tools/cmd/stringer   # Go 1.24+: tool dependency\n# Updates go.mod and go.sum"
      },
      {
       "label": "Tidy dependencies",
       "lang": "bash",
       "code": "go mod tidy\n# Removes unused dependencies, adds missing ones"
      },
      {
       "label": "A modern go.mod",
       "lang": "go",
       "code": "module github.com/acme/orders\n\ngo 1.26              // minimum version: language semantics + GODEBUG defaults\n\ntoolchain go1.26.2   // optional: preferred toolchain for this module\n\nrequire (\n    github.com/jackc/pgx/v5 v5.7.2\n    golang.org/x/sync v0.12.0\n)\n\ntool golang.org/x/tools/cmd/stringer   // Go 1.24+: run with `go tool stringer`"
      }
     ]
    },
    {
     "title": "Basic syntax: variables, types, constants, operators",
     "def": "Go is <strong>statically typed</strong> with <strong>type inference</strong> — every variable has a fixed type determined at compile time, never at runtime. Unlike Python or JavaScript, Go performs <strong>no implicit type conversions</strong>; you must explicitly convert (e.g., <code>float64(myInt)</code>), which prevents subtle bugs from silent coercion.<br><br><strong>Variable declarations:</strong> Two forms: <code>var x int = 10</code> (works everywhere, including package level) and <code>x := 10</code> (short declaration with type inference, only inside functions). The <code>:=</code> operator both declares and assigns. You cannot use <code>:=</code> at package level — this is a common interview question. Redeclaration with <code>:=</code> is allowed if at least one variable on the left is new.<br><br><strong>Zero values:</strong> Every type in Go has a <em>zero value</em> — the default when no explicit value is assigned. Numeric types: <code>0</code>. Strings: <code>\"\"</code> (empty). Booleans: <code>false</code>. Pointers, slices, maps, channels, functions, interfaces: <code>nil</code>. Structs: all fields set to their respective zero values. This design eliminates uninitialized variable bugs — every variable is always usable.<br><br><strong>Constants:</strong> Declared with <code>const</code>, evaluated at compile time. Go constants are <em>untyped</em> by default, meaning they have higher precision and adapt to their usage context. <code>iota</code> is a constant generator that auto-increments within a <code>const</code> block, commonly used to create enums. Go has no built-in enum type — <code>iota</code> with a custom type is the idiomatic pattern.<br><br><strong>Basic types:</strong> <code>bool</code>, <code>string</code>, <code>int</code>/<code>int8</code>/<code>int16</code>/<code>int32</code>/<code>int64</code>, <code>uint</code> variants, <code>float32</code>/<code>float64</code>, <code>complex64</code>/<code>complex128</code>. <code>int</code> and <code>uint</code> are platform-sized (32-bit on 32-bit systems, 64-bit on 64-bit systems).<br><br><strong>Operators:</strong> Arithmetic (<code>+ - * / %</code>), comparison (<code>== != &lt; > &lt;= >=</code>), logical (<code>&& || !</code>), bitwise (<code>& | ^ &lt;&lt; >> &^</code>), assignment (<code>= += -= *= /=</code>). No operator overloading in Go.",
     "interview": "'var vs :=?' — var: explicit type, works everywhere (including package level). :=: type inference, functions only. 'Zero values?' — Numeric: 0, String: \"\", Bool: false, Pointers/slices/maps/channels: nil, Structs: fields set to zero. 'iota?' — Constant generator, auto-increments in const block, used for enums. 'Why no implicit type conversion?' — Prevents subtle bugs, makes code explicit and predictable. 'int vs int64?' — int is platform-sized (32/64-bit), int64 is always 64-bit.",
     "examples": [
      {
       "label": "Variable declarations",
       "lang": "go",
       "code": "var x int = 10\ny := 20  // type inference\nconst Pi = 3.14159\n\n// Multiple variables\nvar a, b int = 1, 2\nc, d := 3, 4"
      },
      {
       "label": "iota for enums",
       "lang": "go",
       "code": "type Day int\nconst (\n    Sunday Day = iota\n    Monday\n    Tuesday\n    Wednesday\n    Thursday\n    Friday\n    Saturday\n)"
      },
      {
       "label": "Type conversion",
       "lang": "go",
       "code": "var i int = 42\nf := float64(i)  // explicit conversion required\n// f := i  // COMPILE ERROR: no implicit conversion"
      }
     ]
    },
    {
     "title": "Control structures: if/else, switch, for loops (no while)",
     "def": "Go deliberately provides only <strong>three control flow keywords</strong>: <code>if</code>, <code>switch</code>, and <code>for</code>. There is no <code>while</code>, no <code>do-while</code>, and no ternary operator — this is a conscious design choice to reduce ambiguity and keep code readable.<br><br><strong>if statement:</strong> Can include an <em>init statement</em> before the condition: <code>if err := fn(); err != nil {}</code>. Variables declared in the init statement are scoped to the if/else block only — they don't leak into the surrounding scope. No parentheses around conditions (unlike C/Java). The condition must be a boolean — no truthy/falsy values (unlike JS/Python).<br><br><strong>switch statement:</strong> Go switch has <strong>implicit break</strong> — each case stops automatically without a <code>break</code> keyword (opposite of C/Java). Use <code>fallthrough</code> to explicitly continue to the next case. <em>Tagless switch</em> (<code>switch {}</code>) replaces long if-else chains. <em>Type switch</em> (<code>switch v := x.(type)</code>) branches on the dynamic type of an interface value. Multiple values per case: <code>case 1, 2, 3:</code>.<br><br><strong>for loop — the ONLY loop:</strong> Go's <code>for</code> handles all iteration patterns: (1) C-style: <code>for i := 0; i &lt; n; i++</code>, (2) while-style: <code>for condition</code>, (3) infinite: <code>for {}</code>, (4) range: <code>for i, v := range collection</code>. The <code>range</code> keyword works on slices (index + value), maps (key + value), strings (index + rune — iterates Unicode code points, not bytes), and channels (value until closed). Use <code>_</code> to discard unwanted values: <code>for _, v := range slice</code>.<br><br><strong>Go 1.22 changes:</strong> loop variables are now per-iteration (not shared across iterations), fixing the classic goroutine-in-loop closure bug; and <code>range</code> works over integers: <code>for i := range 10</code> counts 0..9.<br><br><strong>Go 1.23 range-over-func:</strong> <code>range</code> also accepts iterator functions such as <code>func(yield func(V) bool)</code> (the <code>iter.Seq</code> type), so library code can be looped over like a slice: <code>for k := range maps.Keys(m)</code>. Iterators are covered in Week 4.",
     "interview": "'Why no while?' — for handles all: for init;cond;post, for cond, for range. Simpler, less cognitive load. 'Switch implicit break?' — Yes, opposite of C/Java. Use fallthrough to continue. 'Tagless switch?' — Replaces long if-else chains: switch { case condition: }. 'Range over string?' — Iterates runes (Unicode code points), not bytes. Handles UTF-8 correctly. 'Go 1.22 loop variable change?' — Per-iteration variables fix goroutine-in-loop closure bug. 'What can you range over?' — Slices, arrays, strings (runes), maps, channels, integers (Go 1.22) and iterator functions (Go 1.23, iter.Seq/Seq2).",
     "examples": [
      {
       "label": "if with init statement",
       "lang": "go",
       "code": "if err := doSomething(); err != nil {\n    log.Fatal(err)\n}"
      },
      {
       "label": "Tagless switch",
       "lang": "go",
       "code": "switch {\ncase x < 0:\n    fmt.Println(\"negative\")\ncase x == 0:\n    fmt.Println(\"zero\")\ndefault:\n    fmt.Println(\"positive\")\n}"
      },
      {
       "label": "Range over string",
       "lang": "go",
       "code": "s := \"hello\"\nfor i, r := range s {\n    fmt.Printf(\"%d: %c (U+%04X)\\n\", i, r, r)\n// Output: index, rune, Unicode code point\n}"
      },
      {
       "label": "for patterns",
       "lang": "go",
       "code": "// C-style\nfor i := 0; i < 10; i++ { fmt.Println(i) }\n\n// while-style\nfor condition { /* loop */ }\n\n// infinite\nfor { /* loop forever */ }\n\n// range\nfor i, v := range slice { fmt.Println(i, v) }\n\n// range over an integer (Go 1.22+)\nfor i := range 3 { fmt.Println(i) } // 0 1 2\n\n// range over an iterator function (Go 1.23+)\nfor _, k := range slices.Sorted(maps.Keys(m)) { fmt.Println(k) }"
      }
     ]
    },
    {
     "title": "Functions: multiple return values, named returns, defer",
     "def": "Functions in Go are <strong>first-class citizens</strong> — they can be assigned to variables, passed as arguments, and returned from other functions. This enables powerful patterns like callbacks, middleware chains, and functional programming idioms.<br><br><strong>Multiple return values:</strong> Go functions can return multiple values, enabling the idiomatic <code>(result, error)</code> pattern. This is Go's primary error handling mechanism — every function that can fail returns an error as the last value. <strong>Named return values</strong> are declared in the function signature (<code>func f() (x int, err error)</code>) and can be returned with a bare <code>return</code> statement. Named returns serve as documentation and enable deferred functions to modify the return value.<br><br><strong>Defer:</strong> The <code>defer</code> keyword schedules a function call to execute when the surrounding function returns — regardless of how it returns (normal return, panic, or early return from an error check). Deferred calls execute in <strong>LIFO order</strong> (last-in, first-out). <strong>Critical detail:</strong> arguments to deferred functions are evaluated at the defer statement, not at execution time. Common uses: <code>defer f.Close()</code>, <code>defer mu.Unlock()</code>, <code>defer tx.Rollback()</code>. Pitfall: defer in a loop creates N deferred calls — prefer explicit cleanup or wrap in a function.<br><br><strong>Closures:</strong> Anonymous functions that <em>capture variables from their enclosing scope by reference</em>. The captured variable is shared — modifying it inside the closure affects the original. Classic gotcha: capturing a loop variable in a goroutine closure uses the final value (fixed in Go 1.22 with per-iteration variables).<br><br><strong>Variadic functions:</strong> Accept variable number of arguments: <code>func sum(nums ...int)</code>. Inside the function, <code>nums</code> is a slice of <code>int</code>. Can be called with individual arguments or a slice using <code>...</code>: <code>sum(slice...)</code>.",
     "interview": "'Multiple return values?' — Enables (result, error) pattern. Functions return tuple of values. Named returns: declare in signature, bare return. 'Defer execution order?' — LIFO (last-in, first-out). Arguments evaluated at defer time, not execution. 'Defer in loop?' — Creates N deferred calls that all run only when the function returns, so files/locks stay held until then. Move the loop body into a helper function (or closure) so each defer runs per iteration. 'Closures capture by reference?' — Yes, shared variable. Go 1.22 fixes loop variable capture. 'Variadic functions?' — ...type in signature, becomes slice inside. Call with slice....",
     "examples": [
      {
       "label": "Multiple returns with error",
       "lang": "go",
       "code": "func divide(a, b float64) (float64, error) {\n    if b == 0 {\n        return 0, errors.New(\"division by zero\")\n    }\n    return a / b, nil\n}\n\nresult, err := divide(10, 2)\nif err != nil {\n    log.Fatal(err)\n}"
      },
      {
       "label": "Named returns",
       "lang": "go",
       "code": "func calc(a, b int) (sum int, product int) {\n    sum = a + b\n    product = a * b\n    return  // bare return uses named values\n}"
      },
      {
       "label": "Defer for cleanup",
       "lang": "go",
       "code": "func processFile(path string) error {\n    f, err := os.Open(path)\n    if err != nil {\n        return err\n    }\n    defer f.Close()  // guaranteed cleanup\n    // ... process file\n    return nil\n}"
      },
      {
       "label": "Variadic function",
       "lang": "go",
       "code": "func sum(nums ...int) int {\n    total := 0\n    for _, n := range nums {\n        total += n\n    }\n    return total\n}\n\nsum(1, 2, 3)  // 6\nnums := []int{1, 2, 3}\nsum(nums...)   // 6"
      }
     ]
    },
    {
     "title": "Strings: immutability, runes, encoding",
     "def": "<strong>Strings in Go are immutable</strong> — once created, a string cannot be modified. Operations that appear to modify strings (like <code>+=</code>) actually create new strings. This design enables efficient string sharing and safe concurrent access.<br><br><strong>UTF-8 encoding:</strong> Go strings are UTF-8 encoded byte sequences. This means a single character (rune) can be 1-4 bytes. <code>len(s)</code> returns the number of bytes, not characters. To count characters, use <code>utf8.RuneCountInString(s)</code> or <code>len([]rune(s))</code>.<br><br><strong>Runes:</strong> A <code>rune</code> is an alias for <code>int32</code> and represents a Unicode code point. When you <code>range</code> over a string, you get runes (Unicode characters), not bytes. This correctly handles multi-byte characters like emojis, accented letters, and CJK characters.<br><br><strong>String vs []byte:</strong> Strings are immutable, <code>[]byte</code> is mutable. Use <code>[]byte(s)</code> to convert string to bytes, <code>string(b)</code> to convert back. These conversions copy the data (no shared memory); the compiler elides the copy in a few safe cases such as <code>m[string(b)]</code> lookups, <code>string(b) == \"x\"</code> comparisons and <code>for range []byte(s)</code>.<br><br><strong>String manipulation:</strong> Use the <code>strings</code> package for common operations: <code>strings.Contains</code>, <code>strings.HasPrefix</code>, <code>strings.HasSuffix</code>, <code>strings.Index</code>, <code>strings.Split</code>, <code>strings.Join</code>, <code>strings.ToUpper</code>, <code>strings.ToLower</code>, <code>strings.TrimSpace</code>, <code>strings.Replace</code>.<br><br><strong>String building:</strong> For efficient string concatenation in loops, use <code>strings.Builder</code>. String concatenation with <code>+=</code> in a loop creates many intermediate strings (O(n²) time). <code>strings.Builder</code> uses an internal buffer and has O(n) complexity.<br><br><strong>String comparison:</strong> Use <code>==</code> for case-sensitive comparison, <code>strings.EqualFold</code> for case-insensitive.",
     "interview": "'Are strings mutable?' — No, immutable. Operations that appear to modify create new strings. 'len(s) on string?' — Returns bytes, not characters. Use utf8.RuneCountInString(s) or len([]rune(s)) for character count. 'What is a rune?' — int32 alias, Unicode code point. range over string gives runes, not bytes. 'String vs []byte?' — String immutable, []byte mutable. Conversions copy data. 'Efficient string building?' — Use strings.Builder, not += in loops. += is O(n²), Builder is O(n).",
     "examples": [
      {
       "label": "Byte vs character count",
       "lang": "go",
       "code": "s := \"hello, 世界\"\nfmt.Println(len(s))  // 13 bytes\nfmt.Println(utf8.RuneCountInString(s))  // 8 characters\nfmt.Println(len([]rune(s)))  // 8 characters"
      },
      {
       "label": "Range over string (runes)",
       "lang": "go",
       "code": "s := \"café\"\nfor i, r := range s {\n    fmt.Printf(\"%d: %c (U+%04X)\\n\", i, r, r)\n}\n// Output: byte index, rune, Unicode code point\n// Handles multi-byte UTF-8 correctly"
      },
      {
       "label": "strings.Builder for efficiency",
       "lang": "go",
       "code": "// BAD: O(n²) time\nvar s string\nfor i := 0; i < 1000; i++ {\n    s += strconv.Itoa(i)  // creates new string each iteration\n}\n\n// GOOD: O(n) time\nvar b strings.Builder\nfor i := 0; i < 1000; i++ {\n    b.WriteString(strconv.Itoa(i))\n}\ns := b.String()"
      },
      {
       "label": "String vs []byte conversion",
       "lang": "go",
       "code": "s := \"hello\"\nb := []byte(s)  // string to bytes (copy)\nback := string(b)  // bytes to string (copy)\n\n// No shared memory between s and b"
      }
     ]
    },
    {
     "title": "Packages: import, visibility (exported/unexported), package scope",
     "def": "Go organizes code into <strong>packages</strong> — each directory is one package, and each file starts with <code>package name</code>. Packages are the fundamental unit of encapsulation and reuse in Go.<br><br><strong>Visibility (exported vs unexported):</strong> Go uses a remarkably simple visibility rule: <strong>uppercase first letter = exported</strong> (accessible from other packages), <strong>lowercase = unexported</strong> (package-private). This applies to functions, types, struct fields, methods, constants, and variables. There are no <code>public</code>/<code>private</code>/<code>protected</code> keywords — the naming convention IS the access control. Unexported struct fields cannot be set by external packages, even during JSON unmarshaling (the field is silently skipped).<br><br><strong>The main package:</strong> The entry point of every Go executable. Must contain a <code>func main()</code>. Only the <code>main</code> package is compiled into a binary; other packages produce importable libraries.<br><br><strong>init() function:</strong> A special function that runs <strong>automatically when the package is imported</strong>, before <code>main()</code>. A package can have multiple <code>init()</code> functions (across files), and they run in source file order. Common uses: registering database drivers (<code>_ \"github.com/lib/pq\"</code>), initializing global state, validating configuration. The blank import (<code>_</code>) imports a package solely for its <code>init()</code> side effects.<br><br><strong>internal/ directory:</strong> A special Go convention — packages under <code>internal/</code> can only be imported by code within the parent directory tree. This provides <em>module-level encapsulation</em> beyond the package level, useful for hiding implementation details in libraries.<br><br><strong>Package design principles:</strong> Keep packages small and focused. Name packages with short, lowercase names (e.g., <code>http</code>, <code>strings</code>, <code>fmt</code>). Avoid circular dependencies — Go's compiler rejects them. Group related functionality in the same package.",
     "interview": "'Visibility rules?' — Uppercase first letter = exported (public), lowercase = unexported (private). No public/private keywords. 'main package?' — Entry point, must have func main(). Only main packages compile to executables. 'init() function?' — Runs automatically on package import, before main(). Multiple init() allowed, run in file order. Used for driver registration, global state init. 'internal/ directory?' — Packages under internal/ only importable by parent directory tree. Module-level encapsulation. 'Blank import?' — _ \"pkg\" imports for init() side effects only.",
     "examples": [
      {
       "label": "Exported vs unexported",
       "lang": "go",
       "code": "package math\n\n// Exported (public)\nfunc Add(a, b int) int { return a + b }\nconst Pi = 3.14159\n\n// Unexported (package-private)\nfunc helper(x int) int { return x * 2 }\nconst internalConst = 42"
      },
      {
       "label": "Blank import for init()",
       "lang": "go",
       "code": "import _ \"github.com/lib/pq\"\n// Imports solely to register PostgreSQL driver\n// No direct use of the package"
      },
      {
       "label": "internal/ directory",
       "lang": "go",
       "code": "// project/internal/auth/auth.go\n// Can only be imported by code in project/\n// Cannot be imported by external packages"
      }
     ]
    },
    {
     "title": "Go performance: compiled, goroutines, GC, memory efficiency",
     "def": "Go achieves near-C performance while maintaining developer productivity through several key design decisions:<br><br><strong>Compiled to native code:</strong> Go compiles directly to <strong>machine code</strong> — no JVM, no interpreter, no runtime dependency. The compiler produces a <strong>single binary</strong> that includes the runtime and all Go dependencies; with <code>CGO_ENABLED=0</code> it is fully static (otherwise packages like <code>net</code> and <code>os/user</code> may link libc). This means: no 'install Java/Python/Node first', trivial Docker images (<code>FROM scratch</code>), and instant startup (no JIT warm-up). Cross-compilation is built in: <code>GOOS=linux GOARCH=amd64 go build</code> produces a Linux binary from any OS.<br><br><strong>Goroutines:</strong> Go's concurrency primitive — lightweight user-space threads managed by the Go runtime, not the OS. Key characteristics: <strong>~2KB initial stack</strong> (grows dynamically up to 1GB on 64-bit) vs an OS thread's fixed stack reservation — typically <strong>8 MB of virtual memory on Linux</strong> (<code>ulimit -s</code>), 1 MB by default on Windows. Stack grows and shrinks automatically as needed. Millions of goroutines can run on a single machine, subject to available memory.<br><br><strong>G-M-P Scheduler Model:</strong> Go uses <strong>M:N scheduling</strong> to multiplex many goroutines onto fewer OS threads. The model has three components:<br>• <strong>G (Goroutine)</strong>: The task to execute — a goroutine with its stack, instruction pointer, etc.<br>• <strong>M (Machine)</strong>: An OS thread that actually executes code.<br>• <strong>P (Processor)</strong>: A logical processor that schedules goroutines onto OS threads. The number of P's is <code>GOMAXPROCS</code>: by default the number of CPUs, and since Go 1.25 on Linux also capped by the container's cgroup CPU limit.<br><br>The scheduler efficiently maps M goroutines onto N OS threads. Context switching costs ~100ns (vs ~1-10μs for OS threads).<br><br><strong>Garbage Collection:</strong> Go uses a <strong>concurrent, tri-color mark-and-sweep</strong> collector with <strong>sub-millisecond pauses</strong> (typically &lt; 500μs). It runs concurrently with your program, so it doesn't stop the world for long. The GC is optimized for low latency (soft real-time services, not hard real-time systems), and since Go 1.26 the <em>Green Tea</em> collector, which marks memory span by span for better cache locality, is the default. Tune it with <code>GOGC</code> and <code>GOMEMLIMIT</code>. <strong>Escape analysis</strong> determines if variables can stay on the stack (fast) or must go to the heap (GC-managed).<br><br><strong>Performance vs other languages:</strong> Go is ~10-50x faster than Python, comparable to Java (slightly faster in some benchmarks, slower in others), slightly slower than C/Rust but with much faster compile times (seconds vs minutes/hours).",
     "interview": "'Why is Go fast?' — Native compilation (no JVM/interpreter), static binary, efficient GC, lightweight goroutines (~2KB growable stack), M:N scheduling. 'Goroutine vs OS thread?' — Goroutine: ~2KB stack, managed by Go runtime, cheap context switch (~100ns). OS thread: fixed stack reservation (typically 8 MB virtual on Linux), managed by the kernel, costlier context switch (~1-5μs). 'G-M-P scheduler?' — M goroutines onto N OS threads via P processors. GOMAXPROCS controls P count (cgroup-aware on Linux since Go 1.25). 'GC pause time?' — Sub-millisecond (<500μs), concurrent mark-and-sweep, optimized for low latency.",
     "examples": [
      {
       "label": "Goroutine lightweight",
       "lang": "go",
       "code": "// Goroutines are cheap: 100k is routine, millions are possible\nvar wg sync.WaitGroup\nfor i := range 100_000 {\n    wg.Go(func() { // Go 1.25+: Add(1) + go + Done()\n        _ = i * 2 // do work; i is per-iteration since Go 1.22\n    })\n}\nwg.Wait()"
      },
      {
       "label": "Cross-compilation",
       "lang": "bash",
       "code": "GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o app .\n# Fully static Linux binary from any OS (runs FROM scratch / distroless)"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Calculator with multiple returns",
     "type": "coding",
     "url": "https://leetcode.com/problems/add-two-integers/",
     "ex": "https://exercism.org/tracks/go/exercises/leap"
    },
    {
     "t": "Config loader with validation",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-parking-system/",
     "ex": "https://exercism.org/tracks/go/exercises/booking-up-for-beauty"
    },
    {
     "t": "CLI tool with flag parsing",
     "type": "coding",
     "url": "https://leetcode.com/problems/defanging-an-ip-address/",
     "ex": "https://exercism.org/tracks/go/exercises/weather-forecast"
    },
    {
     "t": "Defer-based resource cleanup",
     "type": "coding",
     "url": "https://leetcode.com/problems/final-value-of-variable-after-performing-operations/",
     "ex": "https://exercism.org/tracks/go/exercises/elons-cars"
    },
    {
     "t": "Package with exported/unexported funcs",
     "type": "coding",
     "url": "https://leetcode.com/problems/build-array-from-permutation/",
     "ex": "https://exercism.org/tracks/go/exercises/lasagna"
    },
    {
     "t": "String manipulation (rune handling)",
     "type": "coding",
     "url": "https://leetcode.com/problems/reverse-string/",
     "ex": "https://exercism.org/tracks/go/exercises/reverse-string"
    },
    {
     "t": "Simple HTTP server",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Error wrapping and inspection",
     "type": "coding",
     "url": "https://leetcode.com/problems/crawler-log-folder/",
     "ex": "https://exercism.org/tracks/go/exercises/error-handling"
    },
    {
     "t": "Struct: value vs pointer receivers",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/elons-cars"
    },
    {
     "t": "JSON encoder/decoder",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-parking-system/",
     "ex": "https://exercism.org/tracks/go/exercises/booking-up-for-beauty"
    },
    {
     "t": "Sum and difference",
     "type": "coding",
     "id": "w1_acode_0",
     "solution": "func sumDiff(a, b int) (int, int) {\n    return a + b, a - b\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/add-two-integers/",
     "ex": "https://exercism.org/tracks/go/exercises/two-fer"
    },
    {
     "t": "Defer cleanup",
     "type": "coding",
     "id": "w1_acode_1",
     "solution": "func process() {\n    defer fmt.Println(\"cleanup\")\n    fmt.Println(\"processing\")\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/elons-cars"
    },
    {
     "t": "Exported + unexported",
     "type": "coding",
     "id": "w1_acode_2",
     "solution": "package math\nfunc Add(a, b int) int { return helper(a, b) }\nfunc helper(a, b int) int { return a + b }",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/lasagna"
    },
    {
     "t": "Error if negative",
     "type": "coding",
     "id": "w1_acode_3",
     "solution": "func validate(n int) error {\n    if n < 0 { return errors.New(\"negative\") }\n    return nil\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/sign-of-the-product-of-an-array/",
     "ex": "https://exercism.org/tracks/go/exercises/raindrops"
    },
    {
     "t": "Day name switch",
     "type": "coding",
     "id": "w1_acode_4",
     "solution": "func dayName(n int) string {\n    switch n {\n    case 1: return \"Mon\"\n    case 2: return \"Tue\"\n    default: return \"?\"\n    }\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/day-of-the-week/",
     "ex": "https://exercism.org/tracks/go/exercises/gigasecond"
    },
    {
     "t": "Variadic sum",
     "type": "coding",
     "id": "w1_acode_5",
     "solution": "func sum(nums ...int) int {\n    t := 0\n    for _, n := range nums { t += n }\n    return t\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/running-sum-of-1d-array/",
     "ex": "https://exercism.org/tracks/go/exercises/hamming"
    },
    {
     "t": "Named returns",
     "type": "coding",
     "id": "w1_acode_6",
     "solution": "func divide(a, b int) (q, r int) {\n    q = a / b; r = a % b; return\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/leap"
    },
    {
     "t": "String builder",
     "type": "coding",
     "id": "w1_acode_7",
     "solution": "func buildString(parts []string) string {\n    var b strings.Builder\n    for _, p := range parts {\n        b.WriteString(p)\n    }\n    return b.String()\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/string-compression/",
     "ex": "https://exercism.org/tracks/go/exercises/acronym"
    },
    {
     "t": "Rune iteration",
     "type": "coding",
     "id": "w1_acode_8",
     "solution": "func countRunes(s string) int {\n    count := 0\n    for range s {\n        count++\n    }\n    return count\n}",
     "lang": "go"
    }
   ],
   "interviewFocus": [
    {
     "q": "Why does Go have no while loops?",
     "a": "Go unifies all loop constructs into a single <code>for</code> keyword. <code>for i := 0; i &lt; n; i++ {}</code> is the classic loop, <code>for condition {}</code> replaces while, <code>for {}</code> is infinite, and <code>for range</code> iterates collections. This design choice reduces cognitive load — one keyword covers all iteration patterns. In interviews, emphasize that this simplicity is a core Go philosophy: fewer concepts, less ambiguity, cleaner code."
    },
    {
     "q": "How does defer work and what are the pitfalls?",
     "a": "<code>defer</code> schedules a function call to execute when the surrounding function returns, in <strong>LIFO (last-in-first-out)</strong> order. Arguments are evaluated at the defer statement, not at execution time. Common pitfalls: (1) Defer inside a loop creates N deferred calls — prefer explicit cleanup. (2) Named return values can be modified by deferred functions. (3) Deferred closures capture variables by reference, so a loop variable in a defer closure uses the final value unless captured explicitly. Use defer for file.Close(), mutex.Unlock(), tx.Rollback() — guaranteed cleanup even on panic."
    },
    {
     "q": "What are Go's package visibility rules?",
     "a": "Go uses a simple convention: <strong>uppercase first letter = exported (public)</strong>, <strong>lowercase = unexported (private)</strong>. This applies to functions, types, struct fields, methods, and constants. The <code>internal/</code> directory pattern restricts access to the parent module only. The <code>init()</code> function runs automatically on package import (before main), useful for registering database drivers or initializing globals. In interviews, mention that this simplicity eliminates access modifier keywords (public/private/protected) found in other languages."
    },
    {
     "q": "Explain multiple return values and error handling in Go.",
     "a": "Go functions can return multiple values, enabling the idiomatic <code>(result, error)</code> pattern. Unlike exceptions in Java/Python, errors are explicit return values that must be checked. This makes error flow visible in the code. <code>errors.New()</code> for simple errors, <code>fmt.Errorf(\"%w\", err)</code> for wrapping with context, <code>errors.Is()</code> for matching, <code>errors.As()</code> for type extraction. In interviews, emphasize: errors are values, not exceptions. The Go philosophy is 'handle errors where they occur, don't hide them behind try/catch'."
    },
    {
     "q": "Why is Go considered fast?",
     "a": "Go compiles to <strong>native machine code</strong> (no JVM/interpreter), producing a single static binary. <strong>Goroutines</strong> start with a ~2KB growable stack (vs a fixed, typically 8 MB virtual stack per OS thread on Linux) with M:N scheduling — you can run millions concurrently. The <strong>concurrent garbage collector</strong> uses tri-color mark-and-sweep with sub-millisecond pauses. <strong>Escape analysis</strong> automatically determines stack vs heap allocation. Method calls on concrete types are static; interface calls are dynamic dispatch through an itab, which the compiler devirtualizes when it can prove the type (PGO makes this more common). In interviews, compare: Go is ~10-50x faster than Python, comparable to Java, slightly slower than C/Rust but with much faster compile times."
    },
    {
     "q": "Are strings mutable in Go? What is a rune?",
     "a": "Strings in Go are <strong>immutable</strong> — operations that appear to modify strings create new strings. A <code>rune</code> is an alias for <code>int32</code> representing a Unicode code point. <code>len(s)</code> returns bytes, not characters. Use <code>utf8.RuneCountInString(s)</code> or <code>len([]rune(s))</code> for character count. When you <code>range</code> over a string, you get runes (Unicode characters), not bytes, which correctly handles multi-byte UTF-8 characters like emojis and CJK text."
    },
    {
     "q": "How do you efficiently build strings in Go?",
     "a": "Use <code>strings.Builder</code> for efficient string concatenation in loops. String concatenation with <code>+=</code> in a loop creates many intermediate strings (O(n²) time). <code>strings.Builder</code> uses an internal buffer and has O(n) complexity. For simple concatenations, <code>+</code> is fine, but for loops or large strings, always use Builder."
    }
   ],
   "quiz": [
    {
     "q": "var vs :=?",
     "a": "var: explicit type, works everywhere. :=: type inference, functions only."
    },
    {
     "q": "Why no while?",
     "a": "for handles all: for init;cond;post, for cond, for range."
    },
    {
     "q": "Zero value: pointer?",
     "a": "nil"
    },
    {
     "q": "Defer?",
     "a": "Schedules call for function return. LIFO order."
    },
    {
     "q": "Exported function?",
     "a": "Name starts with uppercase."
    },
    {
     "q": "GOPATH vs modules?",
     "a": "GOPATH: legacy. Modules (go.mod): modern, versioned deps."
    },
    {
     "q": "Zero: int, string, bool?",
     "a": "0, \"\", false"
    },
    {
     "q": ":= outside functions?",
     "a": "No."
    },
    {
     "q": "go.mod?",
     "a": "Module path, Go version, pinned dependencies."
    },
    {
     "q": "Multiple defers?",
     "a": "LIFO (last-in-first-out)."
    },
    {
     "q": "make vs new?",
     "a": "make: slices/maps/channels. new: allocates, returns pointer."
    },
    {
     "q": "iota?",
     "a": "Auto-incrementing constant generator."
    },
    {
     "q": "Why Go fast?",
     "a": "Native compilation, efficient GC, lightweight goroutines."
    },
    {
     "q": "String len() returns?",
     "a": "Bytes, not characters. Use utf8.RuneCountInString() for characters."
    },
    {
     "q": "Rune?",
     "a": "int32 alias, Unicode code point."
    },
    {
     "q": "String mutable?",
     "a": "No, immutable. Operations create new strings."
    },
    {
     "q": "Efficient string building?",
     "a": "Use strings.Builder, not += in loops."
    },
    {
     "q": "Closure?",
     "a": "Function capturing enclosing scope variables."
    },
    {
     "q": "Blank identifier (_)?",
     "a": "Ignores return values."
    }
   ],
   "resources": [
    {
     "title": "Learn GO Fast",
     "url": "https://www.youtube.com/watch?v=8uiZC0l4Ajw",
     "type": "video"
    },
    {
     "title": "Go Full Course",
     "url": "https://www.youtube.com/watch?v=un6ZyFkqFKo",
     "type": "video"
    },
    {
     "title": "Crash Course Golang",
     "url": "https://www.youtube.com/watch?v=c-bgl_E_23M",
     "type": "video"
    },
    {
     "title": "Golang Full Course",
     "url": "https://www.youtube.com/watch?v=YzLrWHZa-Kc",
     "type": "video"
    }
   ]
  },
  {
   "n": 2,
   "title": "Data Structures & Memory Management",
   "group": "Core Go (Weeks 1–8)",
   "topics": [
    {
     "title": "Arrays vs slices: capacity, length, append, copy",
     "def": "<strong>Arrays</strong> are fixed-size, value-type sequences: <code>[5]int</code> is a distinct type from <code>[3]int</code>. Assigning an array copies all elements. Arrays are rarely used directly — they serve as the backing store for slices.<br><br><strong>Slices</strong> are the workhorse collection in Go. Internally, a slice is a 3-field struct called a <em>slice header</em>: (1) a pointer to an element in the underlying array, (2) <code>len</code> — the number of accessible elements, and (3) <code>cap</code> — total elements from the pointer to the end of the underlying array. When <code>append()</code> is called and length equals capacity, the runtime (<code>growslice</code>) allocates a new, larger array, copies the elements, and returns a slice header pointing to the new array.<br><br><strong>Growth policy (Go 1.18+):</strong> capacity <strong>doubles</strong> while the slice is small; from about <strong>256 elements</strong> the factor transitions smoothly towards <strong>~1.25x</strong> (<code>newcap += (newcap + 3*256) / 4</code>), and the result is then <strong>rounded up to an allocator size class</strong>. For <code>[]int</code> you therefore see 256 → 512 → 848 → 1280 → 1792, not exact multiples. If a single append needs more than that (appending many elements at once), the new capacity is simply the required length, again rounded up. Exact numbers are an implementation detail; pre-size with <code>make([]T, 0, n)</code> or <code>slices.Grow(s, n)</code> when you know n. The old array becomes eligible for garbage collection if no other slice references it.<br><br><strong>Key behaviors:</strong> A nil slice (<code>var s []int</code>) has len=0, cap=0, and is safe to append to. An empty slice (<code>s := []int{}</code>) is non-nil but also len=0. Sub-slicing (<code>a[1:3]</code>) shares memory with the parent — modifying the sub-slice modifies the original. Use <code>copy()</code> for independent deep copies. The <code>append()</code> function always returns a new slice header, so you must reassign: <code>s = append(s, val)</code>.<br><br><strong>Memory gotcha:</strong> a small sub-slice keeps the <em>whole</em> backing array alive. If you keep 10 bytes of a 10 MB buffer, <code>slices.Clone</code> (or copy) them so the big array can be collected.<br><br><strong>slices package (Go 1.21+):</strong> <code>slices.Contains</code>, <code>Index</code>, <code>Insert</code>, <code>Delete</code> (since Go 1.22 it zeroes the vacated tail so removed pointers can be collected), <code>Compact</code>, <code>Sort</code>, <code>SortFunc</code>, <code>BinarySearch</code>, <code>Clone</code>, <code>Equal</code>; Go 1.23 adds iterator helpers <code>slices.All</code>, <code>Values</code>, <code>Collect</code>, <code>Sorted</code>, <code>Chunk</code>.",
     "interview": "'Explain the slice header.' — 3 fields: pointer, length, capacity (24 bytes on 64-bit). 'What happens on append past capacity?' — growslice allocates a bigger array: 2x while small, a smooth transition to ~1.25x from ~256 elements, rounded up to a malloc size class; elements are copied and a new header is returned, so always reassign. 'Nil vs empty slice?' — Both len=0, but nil slice is == nil; empty slice is != nil. Both are appendable; encoding/json marshals nil as null and empty as []. 'Sub-slice memory sharing?' — Sub-slices share the same backing array (and keep it alive); use copy()/slices.Clone for independence and s[i:j:j] to cap capacity.",
     "examples": [
      {
       "label": "Slice internals and growth",
       "lang": "go",
       "code": "// Slice header: {pointer, len, cap}\ns := make([]int, 3, 5) // len=3, cap=5\nfmt.Println(len(s), cap(s)) // 3 5\n\ns = append(s, 4, 5)    // len=5, cap=5 (fits, same array)\ns = append(s, 6)       // len=6: exceeds cap 5 -> new array\nfmt.Println(cap(s))    // 10 (doubled while small)\n\n// Observe the growth pattern (print only when cap changes)\nvar g []int\nlast := -1\nfor i := range 2000 {\n    g = append(g, i)\n    if cap(g) != last {\n        fmt.Print(cap(g), \" \")\n        last = cap(g)\n    }\n}\n// 1 2 4 8 16 32 64 128 256 512 848 1280 1792 2560\n// doubling, then ~1.25x plus size-class rounding. Exact values are an\n// implementation detail: since Go 1.25 a non-escaping slice may even start\n// in a small stack buffer, so you can see 4 8 16 ... instead."
      },
      {
       "label": "Memory sharing and deep copy",
       "lang": "go",
       "code": "original := []int{1, 2, 3, 4, 5}\nsub := original[1:3]      // [2, 3] — shares memory!\nsub[0] = 99               // original is now [1, 99, 3, 4, 5]\n\n// Safe deep copy\nindependent := make([]int, len(original))\ncopy(independent, original)\nindependent[0] = 0        // original unchanged\n\n// Full slice expression to limit capacity\nsafe := original[1:3:3]   // len=2, cap=2 — append won't affect original"
      },
      {
       "label": "Common slice operations",
       "lang": "go",
       "code": "s := []int{3, 1, 4, 1, 5, 9}\n\n// Remove element at index i (modifies the backing array in place)\ni := 2\ns = append(s[:i], s[i+1:]...)  // [3, 1, 1, 5, 9]\n// Go 1.21+: s = slices.Delete(s, i, i+1) does the same and zeroes the tail\n\n// Insert element at index i\nval := 99\ns = append(s[:i], append([]int{val}, s[i:]...)...)\n\n// Filter in-place (no allocation)\nn := 0\nfor _, v := range s {\n    if v > 2 { s[n] = v; n++ }\n}\ns = s[:n]\n\n// De-duplicate (sorted)\nslices.Sort(s)\nj := 0\nfor i := range s {\n    if i == 0 || s[i] != s[i-1] { s[j] = s[i]; j++ }\n}\ns = s[:j]\n\n// Or simply (Go 1.21+):\n// s = slices.Insert(s, i, val)\n// slices.Sort(s); s = slices.Compact(s)"
      }
     ]
    },
    {
     "title": "Maps: key types, value types, concurrency safety",
     "def": "Go maps are <strong>hash tables</strong> — unordered key-value collections with <strong>O(1) average</strong> lookup, insert, and delete. Keys must be <strong>comparable</strong> types (support <code>==</code> and <code>!=</code>): strings, numbers, bools, pointers, arrays, structs with comparable fields. Slices, maps, and functions cannot be keys.<br><br><strong>Internals (Go 1.24+: Swiss tables):</strong> a map is a small header plus a <em>directory</em> of one or more <em>tables</em>. Each table is an open-addressing hash table made of <strong>groups</strong>: 8 key/value <em>slots</em> plus an 8-byte <strong>control word</strong> holding one control byte per slot (empty, deleted, or full plus the low 7 bits of the hash, called H2). A lookup hashes the key with a per-map random seed, uses the upper bits (H1) to choose a starting group, and compares all 8 control bytes against H2 in one bit-parallel operation; only slots whose H2 matches get a full key comparison. If the group has no match and no empty slot, probing moves on to the next group (quadratic probing).<br><br><strong>Growth:</strong> a table grows when it reaches <strong>7/8 load</strong>. Up to 1024 slots it is rebuilt at double size; beyond that it <strong>splits</strong> into two tables, and the directory (extendible hashing on the top hash bits) doubles when needed. Each growth step rehashes only one bounded table, never the whole map, which keeps insert latency predictable. Small maps (up to 8 entries) are just one group with no table at all.<br><br><strong>History (Go 1.23 and earlier):</strong> 2^B buckets of 8 entries with chained overflow buckets, growth when the average load passed 6.5 entries per bucket, and incremental evacuation into a doubled bucket array during later writes. Go 1.24 replaced it (<code>GOEXPERIMENT=noswissmap</code> could opt out in 1.24–1.25), but interviewers may still ask about the old design.<br><br><strong>Consequences:</strong> iteration order is unspecified and <strong>deliberately randomized</strong>, so never depend on it (sort the keys: <code>slices.Sorted(maps.Keys(m))</code>). Map elements are not addressable (<code>&amp;m[k]</code> does not compile) because growth moves entries. Maps never shrink: <code>delete</code> or <code>clear(m)</code> (Go 1.21) frees slots but keeps the table memory, so after a large spike, copy the survivors into a fresh map to release it.<br><br><strong>Thread safety:</strong> Maps are <strong>NOT safe for concurrent read/write</strong>. Unlike a data race that causes subtle bugs, the runtime detects concurrent writes on a best-effort basis and aborts the whole process with <code>fatal error: concurrent map writes</code>. This is a fatal error, not a panic, so <code>recover</code> cannot catch it. A concurrent read and write is also a data race and may crash the same way. Solutions: wrap with <code>sync.RWMutex</code> (most common), use <code>sync.Map</code> for specialized patterns (see Week 5 Sync Primitives for when to use sync.Map vs RWMutex), or use a channel-based access pattern.<br><br><strong>Zero value:</strong> A nil map can be read (returns zero values) but <strong>panics on write</strong>. Always initialize with <code>make()</code> or a literal. The comma-ok idiom <code>val, ok := m[key]</code> distinguishes 'key missing' from 'key exists with zero value'.",
     "interview": "'Thread-safe maps?' — No. Concurrent writes abort the process with a fatal error (not recoverable). Use a Mutex/RWMutex, sharding, or sync.Map for its niche. 'How are maps implemented?' — Since Go 1.24, Swiss tables: groups of 8 slots plus a control word of 7-bit hash fragments probed in parallel, a 7/8 maximum load, and per-table growth with splitting via an extendible-hashing directory. Before 1.24: buckets of 8, load factor 6.5, incremental evacuation. 'Iteration order?' — Unspecified and deliberately randomized; sort the keys if you need order. 'nil map behavior?' — Read returns the zero value, write panics. 'Why can't you take &m[k]?' — Entries move when the table grows. 'Does deleting shrink a map?' — No; rebuild it to release memory.",
     "examples": [
      {
       "label": "Map operations and idioms",
       "lang": "go",
       "code": "// Initialize\ncounts := make(map[string]int)                 // empty, ready to use\nages := map[string]int{\"alice\": 30, \"bob\": 25} // literal\ncounts[\"go\"]++                                  // missing key reads as 0\n\n// Comma-ok idiom: distinguish missing vs zero\nif _, ok := ages[\"charlie\"]; !ok {\n    fmt.Println(\"charlie not found\")\n}\n\n// Delete (safe even if the key does not exist)\ndelete(ages, \"alice\")\n\n// Iterate (order is randomized on purpose!)\nfor k, v := range ages {\n    fmt.Printf(\"%s: %d\\n\", k, v)\n}\n\n// Deterministic order: sort the keys (Go 1.23+ iterators)\nfor _, k := range slices.Sorted(maps.Keys(ages)) {\n    fmt.Println(k, ages[k])\n}\n\nclear(counts) // Go 1.21+: remove all entries (memory is kept)"
      },
      {
       "label": "Counting and grouping patterns",
       "lang": "go",
       "code": "// Word frequency counter\nwords := strings.Fields(text)\nfreq := make(map[string]int)\nfor _, w := range words {\n    freq[w]++  // zero value (0) + 1 = 1 on first occurrence\n}\n\n// Group by category\ntype Item struct { Cat string; Name string }\ngroups := make(map[string][]Item)\nfor _, item := range items {\n    groups[item.Cat] = append(groups[item.Cat], item)\n}\n\n// Set semantics (check membership)\nseen := make(map[string]struct{})  // struct{} uses 0 bytes\nseen[\"apple\"] = struct{}{}\nif _, exists := seen[\"apple\"]; exists { /* ... */ }"
      },
      {
       "label": "Thread-safe map with RWMutex",
       "lang": "go",
       "code": "type SafeMap struct {\n    mu sync.RWMutex\n    m  map[string]int\n}\n\nfunc NewSafeMap() *SafeMap {\n    return &SafeMap{m: make(map[string]int)}\n}\n\nfunc (s *SafeMap) Get(k string) (int, bool) {\n    s.mu.RLock()         // multiple readers OK\n    defer s.mu.RUnlock()\n    v, ok := s.m[k]\n    return v, ok\n}\n\nfunc (s *SafeMap) Set(k string, v int) {\n    s.mu.Lock()          // exclusive write\n    defer s.mu.Unlock()\n    s.m[k] = v\n}\n\nfunc (s *SafeMap) Delete(k string) {\n    s.mu.Lock()\n    defer s.mu.Unlock()\n    delete(s.m, k)\n}"
      }
     ]
    },
    {
     "title": "Structs: embedding, composition vs inheritance",
     "def": "<strong>Structs</strong> are Go's primary data structure for grouping related fields into a single composite type. Unlike classes in OOP languages, structs have <strong>no inheritance hierarchy</strong>. Fields are accessed with dot notation. Struct fields can have <strong>tags</strong> — string metadata used by reflection-based packages like <code>encoding/json</code>, <code>gorm</code>, and <code>validator</code>.<br><br><strong>Embedding</strong> is Go's mechanism for composition: by embedding one struct inside another <em>without a field name</em>, all of the embedded struct's fields and methods are <em>promoted</em> to the outer struct and can be accessed directly. This provides code reuse without inheritance. If the outer struct defines a method with the same name as a promoted method, it <strong>shadows</strong> the embedded one (similar to method overriding).<br><br><strong>Struct comparison:</strong> Structs are comparable (can use <code>==</code>) only if all their fields are comparable. Structs with slice or map fields are not comparable. Use <code>reflect.DeepEqual()</code> for deep comparison in such cases.<br><br><strong>Zero value:</strong> A struct's zero value has all fields set to their respective zero values. This means <code>var u User</code> gives you a valid, usable struct with empty strings, 0 ints, nil pointers, etc.",
     "interview": "'Composition vs inheritance?' — Go uses embedding for composition. No extends keyword, no class hierarchy. 'Method shadowing?' — Outer struct's method hides embedded method of same name. 'Struct tags?' — String metadata for JSON, validation, ORM mapping. Accessed via reflection. 'Can you compare structs?' — Only if all fields are comparable types.",
     "examples": [
      {
       "label": "Embedding and promotion",
       "lang": "go",
       "code": "type Address struct {\n    City, State string\n    Zip         int\n}\n\ntype Person struct {\n    Name    string\n    Age     int\n    Address           // embedded — no field name\n}\n\nfunc (p Person) FullAddress() string {\n    return p.City + \", \" + p.State + \" \" + strconv.Itoa(p.Zip)\n}"
      },
      {
       "label": "Struct comparison",
       "lang": "go",
       "code": "type Point struct { X, Y int }\np1 := Point{1, 2}\np2 := Point{1, 2}\nfmt.Println(p1 == p2)  // true\n\n// Structs with slices are not comparable\ntype Container struct { items []int }\n// c1 == c2  // COMPILE ERROR"
      }
     ]
    },
    {
     "title": "Linked Lists and Doubly Linked Lists",
     "def": "Go has no built-in linked list type — you implement them using structs and pointers. This is intentional: Go provides the building blocks (structs, pointers) and lets you implement the data structure that fits your exact needs.<br><br><strong>Singly Linked List:</strong> Each node has a value and a pointer to the next node. Operations: <code>O(1)</code> insertion at head, <code>O(n)</code> search/insertion at tail, <code>O(n)</code> traversal. Use when: you only need forward traversal, memory efficiency is important.<br><br><strong>Doubly Linked List:</strong> Each node has value, next pointer, and prev pointer. Operations: <code>O(1)</code> insertion/deletion at both ends, <code>O(n)</code> search. Use when: you need bidirectional traversal, frequent insertions/deletions at both ends (e.g., LRU cache, deque).<br><br><strong>Implementation pattern:</strong> Use a dummy head node (sentinel) to simplify edge cases. The list struct holds a pointer to the head and optionally tail for O(1) tail operations. For concurrent access, wrap with <code>sync.Mutex</code>.<br><br><strong>Memory:</strong> Linked lists have overhead per node (pointer(s)). For small, fixed-size data, slices are usually more cache-friendly and faster. Linked lists shine when: data is large (avoid copying), frequent insertions/deletions in the middle, or you need persistent data structures (functional programming).",
     "interview": "'Why no built-in linked list?' — Go provides structs/pointers as building blocks. Implement what you need. 'Singly vs doubly?' — Singly: forward only, less memory. Doubly: bidirectional, more memory, O(1) at both ends. 'When to use linked list vs slice?' — Linked list: frequent inserts/deletes in middle, large data (avoid copying), persistent structures. Slice: cache-friendly, O(1) random access, simpler.",
     "examples": [
      {
       "label": "Singly linked list",
       "lang": "go",
       "code": "type Node struct {\n    Value int\n    Next  *Node\n}\n\ntype LinkedList struct {\n    head *Node\n}\n\nfunc (ll *LinkedList) Insert(v int) {\n    n := &Node{Value: v}\n    n.Next = ll.head\n    ll.head = n\n}\n\nfunc (ll *LinkedList) Traverse() {\n    for n := ll.head; n != nil; n = n.Next {\n        fmt.Println(n.Value)\n    }\n}"
      },
      {
       "label": "Doubly linked list",
       "lang": "go",
       "code": "type Node struct {\n    Value int\n    Prev  *Node\n    Next  *Node\n}\n\ntype DoublyLinkedList struct {\n    head *Node\n    tail *Node\n}\n\nfunc (dll *DoublyLinkedList) Append(v int) {\n    n := &Node{Value: v}\n    if dll.tail == nil {\n        dll.head, dll.tail = n, n\n    } else {\n        dll.tail.Next = n\n        n.Prev = dll.tail\n        dll.tail = n\n    }\n}\n\nfunc (dll *DoublyLinkedList) RemoveLast() {\n    if dll.tail == nil { return }\n    dll.tail = dll.tail.Prev\n    if dll.tail != nil {\n        dll.tail.Next = nil\n    } else {\n        dll.head = nil\n    }\n}"
      }
     ]
    },
    {
     "title": "Pointers: stack vs heap, escape analysis",
     "def": "<strong>Pointers</strong> hold the memory address of a value, created with the address-of operator <code>&</code> and dereferenced with <code>*</code>. Go pointers are <strong>safer than C/C++</strong> because Go has <strong>no pointer arithmetic</strong> — you cannot increment a pointer to walk through memory. Pointers can be nil, and dereferencing a nil pointer causes a runtime panic.<br><br><strong>When to use pointers:</strong> (1) To <strong>modify</strong> a value inside a function (Go is pass-by-value, so without a pointer, functions work on copies). (2) The struct is <strong>large</strong> and you want to avoid copying overhead. (3) You need the value to <strong>outlive</strong> the function that created it. (4) For <strong>optional values</strong> — a <code>*string</code> can be nil (absent) vs empty string.<br><br><strong>Escape analysis</strong> is a compile-time optimization where the Go compiler decides whether a variable lives on the <strong>stack</strong> (fast, automatic cleanup) or the <strong>heap</strong> (slower, needs GC). A variable 'escapes' to the heap when the compiler cannot prove it does not outlive the frame: its address is returned or stored in a global/heap object/channel, it is captured by a closure that escapes, it is converted to an interface passed to code that may retain it (e.g. <code>fmt.Println</code>), or it is too large or has a size unknown at compile time. Escape analysis is per-call-site and benefits from inlining, so the same code can stay on the stack in one caller and escape in another. You can inspect escape decisions with <code>go build -gcflags='-m'</code>. Understanding escape analysis helps write high-performance Go: stack allocations are essentially free, while heap allocations add GC pressure.",
     "interview": "'When to use pointers?' — Modify receiver, avoid copying large structs, value must outlive scope, represent optional values. 'Escape analysis?' — Compiler decides stack vs heap. Variables returned as pointers, captured by closures, or stored in interfaces escape to heap. 'How to check?' — go build -gcflags='-m'. 'Performance impact?' — Stack allocation is nearly free; heap allocation adds GC pressure.",
     "examples": [
      {
       "label": "Pointer fundamentals",
       "lang": "go",
       "code": "x := 42\np := &x           // p is *int, points to x\nfmt.Println(*p)   // 42 (dereference)\n*p = 100          // modify x through pointer\nfmt.Println(x)    // 100\n\n// Nil pointer check (important!)\nvar q *int        // nil pointer\nif q != nil {\n    fmt.Println(*q) // safe access\n}\n\n// Pointer to struct — auto-dereference\ntype User struct { Name string }\nu := &User{Name: \"Alice\"}\nu.Name = \"Bob\"    // Go auto-dereferences: (*u).Name"
      },
      {
       "label": "Escape analysis in practice",
       "lang": "go",
       "code": "// STAYS ON STACK — value doesn't escape\nfunc sum(a, b int) int {\n    result := a + b  // stack allocated\n    return result    // value copied to caller\n}\n\n// ESCAPES TO HEAP — returned as pointer\nfunc newUser(name string) *User {\n    u := User{Name: name}  // escapes! returned as pointer\n    return &u\n}\n\n// ESCAPES — captured by closure\nfunc counter() func() int {\n    n := 0  // escapes! captured by returned closure\n    return func() int { n++; return n }\n}\n\n// Check: go build -gcflags='-m' main.go\n// Output: 'u escapes to heap', 'n escapes to heap'"
      },
      {
       "label": "Value vs pointer receivers",
       "lang": "go",
       "code": "type Rect struct { W, H float64 }\n\n// Value receiver — works on COPY\nfunc (r Rect) Area() float64 {\n    return r.W * r.H\n}\n\n// Pointer receiver — modifies ORIGINAL\nfunc (r *Rect) Scale(f float64) {\n    r.W *= f\n    r.H *= f\n}\n\nr := Rect{10, 5}\nr.Scale(2)           // r is now {20, 10}\nfmt.Println(r.Area()) // 200"
      }
     ]
    },
    {
     "title": "Memory allocation: new vs make",
     "def": "Both <code>new</code> and <code>make</code> allocate memory, but they serve fundamentally different purposes:<br><br><code>new(T)</code> allocates <strong>zeroed memory</strong> for any type T and returns a <code>*T</code> pointer. The memory is zeroed but <strong>not initialized</strong> — for a struct, all fields are zero values. Rarely used in practice because composite literals are more readable: <code>&Config{}</code> is preferred over <code>new(Config)</code>.<br><br><code>make(T, args...)</code> creates and <strong>initializes</strong> only three built-in reference types: slices, maps, and channels. It returns <code>T</code> (not a pointer) because these types already contain internal pointers to their data structures. <code>make</code> is required because these types need internal setup: a slice needs its backing array allocated, a map needs its hash table initialized, and a channel needs its buffer and synchronization primitives.<br><br><strong>Key distinction:</strong> <code>new</code> zeroes memory; <code>make</code> initializes the internal data structure. A <code>new(map[string]int)</code> gives you a <code>*map</code> pointing to a nil map (unusable for writes), while <code>make(map[string]int)</code> gives you an initialized, ready-to-use map.<br><br><strong>Go 1.26:</strong> <code>new</code> also accepts an expression and returns a pointer to a copy of its value: <code>p := new(int64(300))</code>. This replaces helper functions like <code>ptr[T](v T) *T</code> for optional pointer fields (e.g. <code>Timeout: new(30 * time.Second)</code> in a config struct).",
     "interview": "'new vs make?' — new: any type, returns zeroed *T. make: slices/maps/channels only, returns initialized T. 'Why can't you new() a map?' — new gives nil map pointer, useless for writing. make initializes the hash table. 'new vs composite literal?' — &Config{} is idiomatic, new(Config) is rare. 'Go 1.26 new(expr)?' — new now also takes a value expression, so new(42) or new(time.Second) gives a pointer to a copy of that value: handy for optional *T fields.",
     "examples": [
      {
       "label": "new vs make comparison",
       "lang": "go",
       "code": "// new — allocates zeroed memory, returns pointer\np := new(int)        // *int, value is 0\n*p = 42\n\ns := new([]int)      // *[]int → points to nil slice\n// (*s)[0] = 1       // PANIC! nil slice\n\nm := new(map[string]int)  // *map → points to nil map\n// (*m)[\"key\"] = 1   // PANIC! nil map\n\n// make — initializes the internal structure\nslice := make([]int, 5, 10)   // len=5, cap=10, backed by real array\nmp := make(map[string]int)    // hash table initialized, ready to use\nch := make(chan int, 5)        // buffered channel with queue\n\n// Idiomatic Go — prefer composite literals over new\ncfg := &Config{Host: \"localhost\", Port: 8080}  // preferred\ncfg2 := new(Config)  // less clear, all zero values"
      },
      {
       "label": "When each is appropriate",
       "lang": "go",
       "code": "// make is REQUIRED for these three types:\nslice := make([]byte, 0, 1024)    // pre-allocate capacity\ncache := make(map[string]*User)   // ready for reads/writes\njobs := make(chan Job, 100)       // buffered job queue\n\n// new is sometimes useful for:\nvar mu sync.Mutex   // zero value is unlocked, ready to use\nvar wg sync.WaitGroup // zero value is ready to use\n// These don't need make or new — zero values work!\n\n// Common pattern: constructor functions\nfunc NewServer() *Server {\n    return &Server{        // composite literal (not new)\n        routes: make(map[string]Handler),\n        pool:   make(chan *Conn, 100),\n    }\n}"
      }
     ]
    },
    {
     "title": "Priority Queue: container/heap",
     "def": "A <strong>Priority Queue</strong> is a data structure where each element has a priority, and the element with the highest (or lowest) priority is always dequeued first. In Go, priority queues are implemented using the <code>container/heap</code> package, which provides heap operations on any type that implements the <code>heap.Interface</code>.<br><br><strong>heap.Interface:</strong> Your type must implement 5 methods — the 3 from <code>sort.Interface</code> (<code>Len()</code>, <code>Less(i, j int) bool</code>, <code>Swap(i, j int)</code>) plus <code>Push(x any)</code> and <code>Pop() any</code>. The <code>Less</code> method determines priority: for a min-heap (lowest value = highest priority), use <code>a[i] &lt; a[j]</code>; for a max-heap, use <code>a[i] > a[j]</code>.<br><br><strong>Time complexity:</strong> Push and Pop are <strong>O(log n)</strong>. Peek (access index 0) is <strong>O(1)</strong>. heap.Init is <strong>O(n)</strong>. This makes it ideal for scheduling, Dijkstra's algorithm, merge K sorted lists, and streaming top-K problems.<br><br><strong>Critical detail:</strong> Always use <code>heap.Push()</code> and <code>heap.Pop()</code> (package-level functions), NOT the methods directly. The package functions maintain the heap invariant; calling the methods directly breaks it.<br><br><strong>heap.Fix(h, i)</strong>: Call this after modifying the priority of element at index <code>i</code> — re-establishes the heap property in O(log n). Essential for algorithms like Dijkstra where you update distances.<br><br><strong>Common interview applications:</strong> Top-K elements, merge K sorted lists, task scheduling, median finding (two heaps), Dijkstra's shortest path, Huffman encoding.",
     "interview": "'How do you implement a priority queue in Go?' — Use container/heap with a type implementing heap.Interface (Len, Less, Swap, Push, Pop). 'Min vs max heap?' — Flip the Less comparison. 'Time complexity?' — Push/Pop: O(log n), Peek: O(1). 'Why not call Push/Pop directly?' — Package-level heap.Push/Pop maintain the invariant; direct method calls break it. 'heap.Fix?' — Re-heapify after priority change, O(log n).",
     "examples": [
      {
       "label": "Min-heap priority queue",
       "lang": "go",
       "code": "import (\n    \"container/heap\"\n    \"fmt\"\n)\n\n// Item represents a task with priority\ntype Item struct {\n    Value    string\n    Priority int // lower = higher priority (min-heap)\n    Index    int // maintained by heap for Fix()\n}\n\n// PQ implements heap.Interface\ntype PQ []*Item\n\nfunc (pq PQ) Len() int            { return len(pq) }\nfunc (pq PQ) Less(i, j int) bool  { return pq[i].Priority < pq[j].Priority }\nfunc (pq PQ) Swap(i, j int) {\n    pq[i], pq[j] = pq[j], pq[i]\n    pq[i].Index = i\n    pq[j].Index = j\n}\nfunc (pq *PQ) Push(x any)  { item := x.(*Item); item.Index = len(*pq); *pq = append(*pq, item) }\nfunc (pq *PQ) Pop() any    { old := *pq; n := len(old); item := old[n-1]; old[n-1] = nil; item.Index = -1; *pq = old[:n-1]; return item }\n\nfunc main() {\n    pq := &PQ{}\n    heap.Init(pq)\n    heap.Push(pq, &Item{Value: \"low\", Priority: 3})\n    heap.Push(pq, &Item{Value: \"high\", Priority: 1})\n    heap.Push(pq, &Item{Value: \"med\", Priority: 2})\n    for pq.Len() > 0 {\n        item := heap.Pop(pq).(*Item)\n        fmt.Printf(\"%s (pri=%d)\\n\", item.Value, item.Priority)\n        // Output: high(1), med(2), low(3)\n    }\n}"
      },
      {
       "label": "Max-heap and top-K pattern",
       "lang": "go",
       "code": "// Max-heap: just flip Less\ntype MaxHeap []int\nfunc (h MaxHeap) Len() int           { return len(h) }\nfunc (h MaxHeap) Less(i, j int) bool { return h[i] > h[j] } // > for max\nfunc (h MaxHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }\nfunc (h *MaxHeap) Push(x any)        { *h = append(*h, x.(int)) }\nfunc (h *MaxHeap) Pop() any          { old := *h; v := old[len(old)-1]; *h = old[:len(old)-1]; return v }\n\n// Top-K smallest using max-heap of size K\n// Keep a max-heap of K elements. For each new element,\n// if it's smaller than the max, replace the max.\nfunc topK(nums []int, k int) []int {\n    h := &MaxHeap{}\n    for _, n := range nums {\n        heap.Push(h, n)\n        if h.Len() > k { heap.Pop(h) }\n    }\n    return []int(*h) // remaining K smallest\n}"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Dynamic array with resizing",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-dynamic-array-resizable-array/",
     "ex": "https://exercism.org/tracks/go/exercises/difference-of-squares"
    },
    {
     "t": "Thread-safe map",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-hashmap/",
     "ex": "https://exercism.org/tracks/go/exercises/word-count"
    },
    {
     "t": "Binary search tree",
     "type": "coding",
     "url": "https://leetcode.com/problems/validate-binary-search-tree/",
     "ex": "https://exercism.org/tracks/go/exercises/binary-search-tree"
    },
    {
     "t": "LRU cache",
     "type": "coding",
     "url": "https://leetcode.com/problems/lru-cache/"
    },
    {
     "t": "Builder pattern struct",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/elons-cars"
    },
    {
     "t": "Deep copy nested structs",
     "type": "coding",
     "url": "https://leetcode.com/problems/copy-list-with-random-pointer/"
    },
    {
     "t": "Priority queue (heap)",
     "type": "coding",
     "url": "https://leetcode.com/problems/kth-largest-element-in-a-stream/",
     "ex": "https://exercism.org/tracks/go/exercises/tournament"
    },
    {
     "t": "String builder",
     "type": "coding",
     "url": "https://leetcode.com/problems/string-compression/",
     "ex": "https://exercism.org/tracks/go/exercises/acronym"
    },
    {
     "t": "JSON-to-struct mapper",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/booking-up-for-beauty"
    },
    {
     "t": "Slice dedup",
     "type": "coding",
     "url": "https://leetcode.com/problems/remove-duplicates-from-sorted-array/",
     "ex": "https://exercism.org/tracks/go/exercises/strain"
    },
    {
     "t": "Append unique",
     "type": "coding",
     "id": "w2_acode_0",
     "solution": "func appendUnique(s []int, v int) []int {\n    for _, x := range s { if x == v { return s } }\n    return append(s, v)\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/remove-duplicates-from-sorted-array/"
    },
    {
     "t": "Remove by index",
     "type": "coding",
     "id": "w2_acode_1",
     "solution": "func remove(s []int, i int) []int {\n    return append(s[:i], s[i+1:]...)\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/remove-element/"
    },
    {
     "t": "Map keys",
     "type": "coding",
     "id": "w2_acode_2",
     "solution": "func keys(m map[string]int) []string {\n    k := make([]string, 0, len(m))\n    for key := range m { k = append(k, key) }\n    return k\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/design-hashmap/",
     "ex": "https://exercism.org/tracks/go/exercises/word-count"
    },
    {
     "t": "Embedding",
     "type": "coding",
     "id": "w2_acode_3",
     "solution": "type Person struct { Name string }\nfunc (p Person) Greet() string { return \"Hi, \" + p.Name }\ntype Employee struct { Person; ID int }",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/elons-cars"
    },
    {
     "t": "Thread-safe counter",
     "type": "coding",
     "id": "w2_acode_4",
     "solution": "type Counter struct { mu sync.Mutex; val int }\nfunc (c *Counter) Inc() { c.mu.Lock(); defer c.mu.Unlock(); c.val++ }",
     "lang": "go",
     "url": "https://leetcode.com/problems/design-hashmap/"
    },
    {
     "t": "Merge maps",
     "type": "coding",
     "id": "w2_acode_5",
     "solution": "func merge(a, b map[string]int) map[string]int {\n    r := make(map[string]int)\n    for k,v := range a { r[k] = v }\n    for k,v := range b { r[k] = v }\n    return r\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/merge-two-sorted-lists/",
     "ex": "https://exercism.org/tracks/go/exercises/word-count"
    }
   ],
   "interviewFocus": [
    {
     "q": "How does slice append work internally? What happens when capacity is exceeded?",
     "a": "A slice has three fields: pointer to underlying array, length, and capacity. When <code>append()</code> is called and length equals capacity, Go allocates a new, larger array (2x while the slice is small, then a smooth transition to about 1.25x from roughly 256 elements, rounded up to an allocator size class), copies all elements, and returns a slice pointing to the new array. This is why <code>append</code> returns a value — the original slice may point to stale data. <strong>Interview tip:</strong> Always reassign: <code>s = append(s, val)</code>. Mention that sub-slices share memory with the parent, which can cause subtle bugs if the parent is modified."
    },
    {
     "q": "Are Go maps thread-safe? How do you handle concurrent map access?",
     "a": "<strong>No</strong> — Go maps are not safe for concurrent read/write. Concurrent writes are detected on a best-effort basis and abort the process with <code>fatal error: concurrent map writes</code>. It is a fatal error, so <code>recover</code> cannot catch it, and an unsynchronized read plus write is still a data race. Solutions: (1) <code>sync.Mutex</code> or <code>sync.RWMutex</code> wrapping the map — RWMutex only helps when reads dominate and the critical sections do real work, so benchmark it against a plain Mutex. (2) <code>sync.Map</code> — optimized for two patterns: key written once and read many, or disjoint key access by goroutines. (3) Channel-based access — send requests to a goroutine owning the map. In interviews, prefer mutex for most cases; mention sync.Map only for specialized scenarios."
    },
    {
     "q": "Pointer vs value semantics — when should you use pointers in Go?",
     "a": "Use pointers when: (1) You need to <strong>modify the receiver</strong> in a method. (2) The struct is <strong>large</strong> and you want to avoid copying overhead. (3) You need the value to <strong>outlive the current scope</strong>. (4) For <strong>consistency</strong> — if one method needs a pointer receiver, make all methods pointer receivers. Use values when: struct is small (like time.Time), you want immutability guarantees, or the type represents a simple value (coordinates, colors). <strong>Key insight:</strong> Go's escape analysis automatically moves values to the heap when needed, so pointers aren't about manual memory management."
    },
    {
     "q": "Explain new vs make in Go. When do you use each?",
     "a": "<code>new(T)</code> allocates zeroed memory for type T and returns a <code>*T</code> pointer. Works for any type. <code>make(T, args)</code> creates and initializes slices, maps, and channels — returns T (not a pointer) because these types are already reference types internally. <code>make</code> is required because these types need internal data structure initialization (slice needs length/capacity, map needs hash table, channel needs buffer). You cannot use <code>new</code> for a ready-to-use map (it would be nil)."
    }
   ],
   "quiz": [
    {
     "q": "Arrays vs slices?",
     "a": "Array: fixed, value. Slice: dynamic, reference."
    },
    {
     "q": "Append past cap?",
     "a": "growslice allocates a bigger array (2x while small, ~1.25x from ~256 elements, rounded up to a size class), copies, and returns a new header."
    },
    {
     "q": "Maps thread-safe?",
     "a": "No. Concurrent writes cause an unrecoverable fatal error. Use a Mutex/RWMutex (or sync.Map for its niche cases)."
    },
    {
     "q": "Struct embedding?",
     "a": "Promotes fields/methods. Composition."
    },
    {
     "q": "Escape analysis?",
     "a": "Compiler decides stack vs heap."
    },
    {
     "q": "new()?",
     "a": "Allocates zeroed memory, returns pointer."
    },
    {
     "q": "make()?",
     "a": "Creates initialized slices/maps/channels."
    },
    {
     "q": "nil slice?",
     "a": "Appendable, length 0."
    },
    {
     "q": "copy() vs assignment?",
     "a": "Assignment: header. copy(): elements."
    },
    {
     "q": "nil map?",
     "a": "Can't write. Must make() first."
    }
   ],
   "resources": [
    {
     "title": "Arrays vs Slices",
     "url": "https://www.youtube.com/watch?v=PWKitj9tq8A",
     "type": "video"
    },
    {
     "title": "Go: Slices & Maps",
     "url": "https://www.youtube.com/watch?v=un6ZyFkqFKo",
     "type": "video"
    },
    {
     "title": "Go Blog — Go Slices: usage and internals",
     "url": "https://go.dev/blog/slices-intro",
     "type": "article"
    },
    {
     "title": "Go Blog — Faster Go maps with Swiss Tables",
     "url": "https://go.dev/blog/swisstable",
     "type": "article"
    },
    {
     "title": "Go package slices",
     "url": "https://pkg.go.dev/slices",
     "type": "docs"
    }
   ]
  },
  {
   "n": 3,
   "title": "OOP Patterns in Go",
   "group": "Core Go (Weeks 1–8)",
   "topics": [
    {
     "title": "Methods: value vs pointer receivers",
     "def": "In Go, a <strong>method</strong> is a function with a special <em>receiver</em> argument between <code>func</code> and the method name. The receiver binds the method to a specific type. Go has two kinds of receivers:<br><br><strong>Value receiver</strong> (<code>func (r Rect) Area()</code>): the method receives a <em>copy</em> of the value. Any modifications inside the method do not affect the original. Use for read-only operations and small structs.<br><br><strong>Pointer receiver</strong> (<code>func (r *Rect) Scale(f float64)</code>): the method receives a pointer to the original value. Can modify the original. Use when: (1) the method needs to mutate state, (2) the struct is large and you want to avoid copying overhead, (3) for consistency — if any method needs a pointer receiver, make all methods pointer receivers.<br><br><strong>Method sets (critical for interfaces):</strong> A <em>pointer type</em> (<code>*T</code>) has access to both value and pointer receiver methods. A <em>value type</em> (<code>T</code>) only has access to value receiver methods. This means: if an interface requires a pointer-receiver method, only <code>*T</code> (not <code>T</code>) satisfies that interface. This is a common source of confusion and interview questions.<br><br><strong>Automatic dereferencing:</strong> Go automatically takes the address of a value when calling a pointer-receiver method on a value: <code>r.Scale(2)</code> works even if <code>r</code> is not a pointer (Go internally converts it to <code>(&r).Scale(2)</code>). However, this only works for addressable values — you can't call a pointer method on a map value or a function return value directly.",
     "interview": "'Can a value type satisfy an interface with pointer-receiver methods?' — No. Only *T satisfies interfaces requiring pointer receivers. 'Value vs pointer receiver?' — Value: read-only, copy. Pointer: mutate, avoid copy, consistency. 'Method sets?' — *T has all methods; T only has value-receiver methods. 'Auto-dereference?' — Go auto-takes address for pointer methods on addressable values.",
     "examples": [
      {
       "label": "Value vs pointer receivers",
       "lang": "go",
       "code": "type Rect struct { W, H float64 }\n\n// Value receiver — works on COPY, doesn't modify original\nfunc (r Rect) Area() float64 {\n    return r.W * r.H\n}\n\n// Pointer receiver — modifies ORIGINAL\nfunc (r *Rect) Scale(f float64) {\n    r.W *= f\n    r.H *= f\n}\n\nr := Rect{10, 5}\nfmt.Println(r.Area()) // 50\nr.Scale(2)            // r is now {20, 10}\nfmt.Println(r.Area()) // 200"
      },
      {
       "label": "Method sets and interface satisfaction",
       "lang": "go",
       "code": "type Sizer interface {\n    Size() int\n}\n\ntype Resizer interface {\n    Resize(int)  // pointer receiver needed\n}\n\ntype Box struct { side int }\n\nfunc (b Box) Size() int      { return b.side * b.side }\nfunc (b *Box) Resize(s int)  { b.side = s }  // pointer receiver\n\n// Box satisfies Sizer (value method)\nvar s Sizer = Box{5}      // OK\n\n// Box does NOT satisfy Resizer (pointer method)\n// var r Resizer = Box{5}  // COMPILE ERROR!\nvar r Resizer = &Box{5}    // OK — *Box has all methods"
      }
     ]
    },
    {
     "title": "Interfaces: implicit, empty, type assertions",
     "def": "When working with interfaces in Go, you often need to access the <strong>concrete type</strong> stored inside the interface value. Go provides two mechanisms for this:<br><br><strong>Type assertion</strong> (<code>value, ok := iface.(ConcreteType)</code>): extracts the concrete value from an interface. The <strong>two-value form</strong> (comma-ok) is safe — if the assertion fails, <code>ok</code> is false and <code>value</code> is the zero value of the target type. The <strong>single-value form</strong> (<code>value := iface.(ConcreteType)</code>) panics if the assertion fails — avoid this unless you're certain of the type. Type assertions only work on interface values, not on concrete types.<br><br><strong>Type switch</strong> (<code>switch v := x.(type)</code>): cleanly handles multiple possible types in a single construct. The variable <code>v</code> is automatically narrowed to the matched type within each case branch — no explicit casting needed. You can combine multiple types in one case: <code>case int, int64:</code>. The <code>default</code> case catches unmatched types.<br><br><strong>Common use cases:</strong> JSON parsing (unknown structure returns <code>map[string]interface{}</code>), plugin systems (handlers return <code>interface{}</code>), middleware (context values stored as <code>any</code>), error handling (<code>errors.As()</code> uses type assertions internally), and protocol deserialization.<br><br><strong>Interface internals relevant to assertions:</strong> An interface value is internally two words. For a <strong>non-empty interface</strong> (<code>iface</code>, e.g. <code>io.Reader</code>, <code>error</code>) the first word points to an <strong>itab</strong>: the interface type, the concrete <code>*_type</code> and a table of method pointers, built once per (interface, concrete type) pair and cached. The <strong>empty interface</strong> <code>any</code> (<code>eface</code>) has no methods to dispatch, so its first word points <em>directly</em> to the concrete type's <code>*_type</code> descriptor; it has no itab. The second word is a pointer to the data. Asserting to a concrete type compares that type pointer, which is a single comparison. Asserting to another interface (<code>r.(io.Writer)</code>) needs a cached itab lookup. Because the type word is set, an interface holding a nil concrete pointer is <em>not</em> equal to nil.",
     "interview": "'Type assertion vs type switch?' — Assertion: known single type, returns value + ok. Switch: multiple possible types, cleaner than chained assertions. 'Single-value assertion danger?' — Panics if wrong type. Always use comma-ok form. 'Interface nil gotcha?' — Interface with nil concrete value is NOT nil (type pointer is set). 'errors.As internally?' — Uses type assertion to find matching error in chain. 'eface vs iface?' — any is (*_type, data); a non-empty interface is (*itab, data), where the itab adds the interface type and the method table used for dynamic dispatch.",
     "examples": [
      {
       "label": "Type assertion patterns",
       "lang": "go",
       "code": "var val interface{} = \"hello\"\n\n// Safe assertion (two-value)\ns, ok := val.(string)\nif ok { fmt.Println(s) }\n\n// Dangerous assertion (panics if wrong type)\n// n := val.(int) // PANIC!\n\n// Type switch\nfunc classify(v interface{}) string {\n    switch v.(type) {\n    case int: return \"integer\"\n    case string: return \"string\"\n    case bool: return \"boolean\"\n    default: return fmt.Sprintf(\"unknown: %T\", v)\n    }\n}"
      },
      {
       "label": "Practical: JSON parsing",
       "lang": "go",
       "code": "// Parse unknown JSON structure\nvar data interface{}\njson.Unmarshal(jsonBytes, &data)\n\nswitch v := data.(type) {\ncase map[string]interface{}:\n    for key, val := range v {\n        fmt.Printf(\"%s: %v\\n\", key, val)\n    }\ncase []interface{}:\n    fmt.Println(\"Array with\", len(v), \"items\")\n}"
      }
     ]
    },
    {
     "title": "Composition: embedding vs inheritance",
     "def": "Go deliberately omits classes and inheritance hierarchies. Instead, it provides two powerful composition mechanisms:<br><br><strong>1. Struct embedding (has-a + is-a behavior):</strong> Embed a struct to reuse its fields and methods. Promoted methods can be called directly on the outer struct, giving the appearance of inheritance without the fragile base class problem. The outer struct can <strong>shadow</strong> an embedded method by defining its own method with the same name.<br><br><strong>2. Interface composition:</strong> Small interfaces can be combined: <code>type ReadWriteCloser interface { Reader; Writer; Closer }</code>. The standard library exemplifies this — <code>io.Reader</code> has one method, yet it's one of Go's most powerful abstractions.<br><br><strong>Why no inheritance?</strong> Inheritance creates tight coupling and the <em>fragile base class problem</em> — changing a parent class can break child classes in unexpected ways. Go's composition approach is explicit, loosely coupled, and testable. Each component can be tested independently. Mocking is easy: define a small interface matching only the methods you need.<br><br><strong>Design principle:</strong> Accept interfaces, return structs. Define small interfaces (1-3 methods) in the consumer package. Use embedding for shared implementation, interfaces for shared behavior.",
     "interview": "'Composition vs inheritance?' — Go uses embedding (code reuse) + interfaces (behavior abstraction). No class hierarchy, no fragile base class. 'Why is this better?' — Loose coupling, easy testing, no diamond inheritance. 'Embedding vs named field?' — Embedding promotes methods; named field requires explicit access. 'Design principle?' — Accept interfaces, return structs. Small interfaces.",
     "examples": [
      {
       "label": "Struct embedding for code reuse",
       "lang": "go",
       "code": "type Logger struct { prefix string }\nfunc (l Logger) Log(msg string) {\n    fmt.Printf(\"[%s] %s\\n\", l.prefix, msg)\n}\nfunc (l Logger) Warn(msg string) {\n    fmt.Printf(\"[%s] WARN: %s\\n\", l.prefix, msg)\n}\n\ntype UserService struct {\n    Logger  // embedded — promotes Log() and Warn()\n    db *sql.DB\n}\n\nsvc := UserService{Logger: Logger{\"UserSvc\"}, db: db}\nsvc.Log(\"starting\")   // promoted from Logger\nsvc.Warn(\"no users\")  // promoted from Logger"
      },
      {
       "label": "Interface composition (stdlib pattern)",
       "lang": "go",
       "code": "// Small, composable interfaces (Go stdlib)\ntype Reader interface { Read(p []byte) (n int, err error) }\ntype Writer interface { Write(p []byte) (n int, err error) }\ntype Closer interface { Close() error }\n\n// Composed from small interfaces\ntype ReadWriter interface { Reader; Writer }\ntype ReadWriteCloser interface { Reader; Writer; Closer }\n\n// Accept interface (flexible), return struct (concrete)\nfunc NewService(repo UserRepository) *UserService {\n    return &UserService{repo: repo}\n}\n\n// Easy mocking — define only methods you need\ntype mockRepo struct{}\nfunc (m mockRepo) FindByID(id int) (*User, error) {\n    return &User{ID: id, Name: \"mock\"}, nil\n}"
      }
     ]
    },
    {
     "title": "Error handling: custom errors, wrapping",
     "def": "Go handles errors through <strong>explicit return values</strong>, not exceptions. The built-in <code>error</code> interface has one method: <code>Error() string</code>. Any type implementing this method is an error. This makes error flow visible in code — every error must be explicitly checked.<br><br><strong>Creating errors:</strong><br>• <code>errors.New(\"message\")</code> — simple string error<br>• <code>fmt.Errorf(\"context: %w\", err)</code> — wraps an error with additional context while preserving the original for inspection<br>• <strong>Custom error types</strong> — structs implementing <code>Error() string</code> that carry structured data (field name, HTTP status code, retry info)<br><br><strong>Error inspection (Go 1.13+):</strong><br>• <code>errors.Is(err, target)</code> — checks if <em>any error in the chain</em> matches the target (uses <code>==</code> comparison). Walks the wrapped chain.<br>• <code>errors.As(err, &target)</code> — finds the first error in the chain that can be assigned to the target pointer. Used to extract typed error data.<br>• <code>errors.Unwrap(err)</code> — returns the next error in the chain.<br><br><strong>Sentinel errors:</strong> Package-level error variables like <code>io.EOF</code>, <code>sql.ErrNoRows</code>. Check with <code>errors.Is()</code>. Good for well-known, expected conditions.<br><br><strong>Panic/Recover:</strong> <code>panic()</code> is for truly unrecoverable situations (programming errors, missing required config). <code>recover()</code> catches panics, used almost exclusively in middleware/frameworks. Normal errors should <strong>never</strong> use panic.<br><br><strong>Modern error APIs:</strong> <code>errors.Join(errs...)</code> and multiple <code>%w</code> verbs in one <code>fmt.Errorf</code> (Go 1.20) build error <em>trees</em>, and <code>errors.Is</code>/<code>As</code> search them depth-first. Go 1.26 adds the generic <code>errors.AsType[*MyErr](err)</code>, which returns <code>(*MyErr, bool)</code> without declaring a target variable. A custom type can implement <code>Is(error) bool</code> or <code>As(any) bool</code> to customize matching. Wrap with <code>%w</code> only when callers may depend on the wrapped error (it becomes part of your API); otherwise format it with <code>%v</code>.",
     "interview": "'errors.Is vs errors.As?' — Is: equality match (walks chain). As: type extraction (finds first matching type). 'When to use custom error types?' — When callers need structured data (HTTP status, field name, retry info). 'Wrapping vs new error?' — Wrap to preserve chain, new for independent errors. 'Panic vs error?' — Panic for programmer bugs only. Errors for expected failures. 'Sentinel errors?' — Package-level vars (io.EOF, sql.ErrNoRows), check with errors.Is(). 'errors.Join / multiple %w?' — Go 1.20 error trees; Is/As walk them depth-first. 'errors.AsType?' — Go 1.26 generic As: if ve, ok := errors.AsType[*ValidationError](err); ok { ... }.",
     "examples": [
      {
       "label": "Error wrapping chain",
       "lang": "go",
       "code": "// Build an error chain with context\nfunc readConfig(path string) (*Config, error) {\n    data, err := os.ReadFile(path)\n    if err != nil {\n        return nil, fmt.Errorf(\"readConfig %s: %w\", path, err)\n    }\n    var cfg Config\n    if err := json.Unmarshal(data, &cfg); err != nil {\n        return nil, fmt.Errorf(\"parse config: %w\", err)\n    }\n    return &cfg, nil\n}\n\n// Inspect the chain\ncfg, err := readConfig(\"/etc/app.json\")\nif errors.Is(err, os.ErrNotExist) {\n    log.Println(\"Config file missing, using defaults\")\n} else if err != nil {\n    log.Fatal(err)\n}"
      },
      {
       "label": "Custom error type with structured data",
       "lang": "go",
       "code": "type ValidationError struct {\n    Field   string\n    Message string\n    Code    int\n}\n\nfunc (e *ValidationError) Error() string {\n    return fmt.Sprintf(\"%s: %s (code %d)\", e.Field, e.Message, e.Code)\n}\n\nfunc validateAge(age int) error {\n    if age < 0 {\n        return &ValidationError{\"age\", \"must be non-negative\", 400}\n    }\n    if age > 150 {\n        return &ValidationError{\"age\", \"unrealistic value\", 422}\n    }\n    return nil\n}\n\n// Extract structured error data\nif err := validateAge(-5); err != nil {\n    var ve *ValidationError\n    if errors.As(err, &ve) {\n        fmt.Printf(\"Field: %s, Code: %d\\n\", ve.Field, ve.Code)\n    }\n}"
      },
      {
       "label": "errors.Join and errors.AsType (Go 1.26)",
       "lang": "go",
       "code": "func validate(u User) error {\n    var errs []error\n    if u.Name == \"\" {\n        errs = append(errs, &ValidationError{Field: \"name\", Message: \"required\", Code: 400})\n    }\n    if u.Age < 0 {\n        errs = append(errs, &ValidationError{Field: \"age\", Message: \"must be >= 0\", Code: 400})\n    }\n    return errors.Join(errs...) // nil when errs is empty\n}\n\nerr := validate(User{Age: -1})\n\n// Go 1.26+: generic, no target variable needed\nif ve, ok := errors.AsType[*ValidationError](err); ok {\n    fmt.Println(\"first invalid field:\", ve.Field) // name\n}\n\n// Before 1.26:\n// var ve *ValidationError\n// if errors.As(err, &ve) { ... }"
      }
     ]
    },
    {
     "title": "Type assertions and type switches",
     "def": "Go interfaces define a <strong>set of method signatures</strong> that a type must implement. The revolutionary aspect: satisfaction is <strong>implicit</strong> — there is no <code>implements</code> keyword. If a type has all the methods an interface requires (with matching names, parameters, and return types), it automatically satisfies that interface. This is sometimes called <em>structural typing</em> or <em>compile-time duck typing</em>.<br><br><strong>Key concepts:</strong><br>• <strong>Empty interface</strong> (<code>any</code> / <code>interface{}</code>): satisfied by every type. Used for truly generic parameters (like <code>fmt.Println</code>). With Go 1.18+ generics, most uses of <code>any</code> should be replaced with type parameters.<br>• <strong>Interface composition</strong>: interfaces can embed other interfaces. <code>io.ReadWriter</code> embeds <code>io.Reader</code> + <code>io.Writer</code>. This creates powerful small interfaces that compose into larger ones.<br>• <strong>Nil interfaces vs nil concrete value</strong>: an interface is nil only when both its type and value are nil. An interface holding a nil pointer (<code>var w io.Writer = (*os.File)(nil)</code>) is <strong>not nil</strong> — this is a common gotcha that causes bugs in error handling.<br>• <strong>Interface size</strong>: an interface value is two words. A non-empty interface holds <code>(itab, data)</code>, where the itab carries the type and method table. The empty interface <code>any</code> holds <code>(*_type, data)</code> with no itab. The data word is always a pointer, so storing a non-pointer value (such as a struct) usually copies it to the heap. The runtime avoids that allocation for zero-sized values, single-byte values and small integers, and the compiler avoids it for constants.<br><br><strong>Best practice:</strong> Define small interfaces (1-3 methods) in the <em>consumer</em> package, not the <em>implementer</em>. Accept interfaces, return concrete types.",
     "interview": "'Go vs Java interfaces?' — Go: implicit satisfaction, consumer-side definition. Java: explicit implements, provider-side. 'Nil interface gotcha?' — Interface with nil concrete value is NOT nil. 'Best practice?' — Small interfaces in consumer package. Accept interfaces, return structs. 'Interface internal representation?' — Two words: (itab, data) for non-empty interfaces; (*_type, data) for any, which has no itab because there are no methods to dispatch.",
     "examples": [
      {
       "label": "Implicit satisfaction and composition",
       "lang": "go",
       "code": "// Small, focused interfaces (Go standard library pattern)\ntype Reader interface { Read(p []byte) (n int, err error) }\ntype Writer interface { Write(p []byte) (n int, err error) }\ntype Closer interface { Close() error }\n\n// Composed interfaces\ntype ReadWriter interface { Reader; Writer }\ntype ReadWriteCloser interface { Reader; Writer; Closer }\n\n// Any type with Read() satisfies Reader — no 'implements'\ntype MyBuffer struct { data []byte }\nfunc (b *MyBuffer) Read(p []byte) (int, error) {\n    n := copy(p, b.data)\n    return n, io.EOF\n}"
      },
      {
       "label": "Nil interface gotcha and type assertions",
       "lang": "go",
       "code": "// DANGEROUS: nil interface vs nil concrete value\nvar err error = nil\nfmt.Println(err == nil)     // true — both type and value are nil\n\nvar p *os.PathError = nil\nerr = p                     // err holds (*os.PathError, nil)\nfmt.Println(err == nil)     // FALSE! type is set\n\n// Safe type assertion (two-value form)\nval, ok := err.(*os.PathError)\nif ok { fmt.Println(val.Path) }\n\n// Type switch for multiple types\nfunc classify(v any) string {\n    switch v := v.(type) {\n    case int:    return fmt.Sprintf(\"int: %d\", v)\n    case string: return fmt.Sprintf(\"string: %q\", v)\n    case error:  return fmt.Sprintf(\"error: %v\", v)\n    default:     return fmt.Sprintf(\"unknown: %T\", v)\n    }\n}"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Sorting interface",
     "type": "coding",
     "url": "https://leetcode.com/problems/sort-an-array/",
     "ex": "https://exercism.org/tracks/go/exercises/tournament"
    },
    {
     "t": "Logger with impls",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/logs-logs-logs"
    },
    {
     "t": "Plugin system",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/animal-magic"
    },
    {
     "t": "Error wrapping",
     "type": "coding",
     "solution": "func read(p string) error {\n    _, err := os.ReadFile(p)\n    if err != nil { return fmt.Errorf(\"read %s: %w\", p, err) }\n    return nil\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/error-handling"
    },
    {
     "t": "Enum with iota",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/weather-forecast"
    },
    {
     "t": "Factory pattern",
     "type": "coding",
     "solution": "type Logger interface { Log(string) }\ntype CLog struct{}\nfunc (c CLog) Log(s string) { fmt.Println(s) }\nfunc NewLogger() Logger { return CLog{} }",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/need-for-speed"
    },
    {
     "t": "Strategy pattern",
     "type": "coding",
     "url": "https://leetcode.com/problems/sort-an-array/",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    },
    {
     "t": "Repository + mock",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Middleware chain",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Circuit breaker",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-bounded-blocking-queue/",
     "ex": "https://exercism.org/tracks/go/exercises/error-handling"
    },
    {
     "t": "Custom error",
     "type": "coding",
     "id": "w3_acode_0",
     "solution": "type ValErr struct { Field, Msg string }\nfunc (e *ValErr) Error() string { return e.Field + \": \" + e.Msg }",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/error-handling"
    },
    {
     "t": "Interface + impls",
     "type": "coding",
     "id": "w3_acode_1",
     "solution": "type Speaker interface { Speak() string }\ntype Dog struct{}\nfunc (d Dog) Speak() string { return \"Woof\" }\ntype Cat struct{}\nfunc (c Cat) Speak() string { return \"Meow\" }",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/animal-magic"
    },
    {
     "t": "Type switch",
     "type": "coding",
     "id": "w3_acode_3",
     "solution": "func desc(i any) string {\n    switch v := i.(type) {\n    case int: return fmt.Sprintf(\"%d\", v)\n    case string: return v\n    default: return \"?\"\n    }\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/parsing-log-files"
    },
    {
     "t": "sort.Interface",
     "type": "coding",
     "id": "w3_acode_4",
     "solution": "type ByAge []Person\nfunc (a ByAge) Len() int { return len(a) }\nfunc (a ByAge) Less(i,j int) bool { return a[i].Age < a[j].Age }\nfunc (a ByAge) Swap(i,j int) { a[i], a[j] = a[j], a[i] }",
     "lang": "go",
     "url": "https://leetcode.com/problems/sort-an-array/",
     "ex": "https://exercism.org/tracks/go/exercises/tournament"
    }
   ],
   "interviewFocus": [
    {
     "q": "How does Go's interface satisfaction work, and how does it differ from Java/C#?",
     "a": "Go interfaces are satisfied <strong>implicitly</strong> — there is no <code>implements</code> keyword. If a type has all the methods an interface requires, it automatically satisfies that interface. This enables <strong>decoupling</strong>: you can define an interface in the consumer package, and the implementing package doesn't need to import it. This is the opposite of Java where the implementor must declare <code>implements</code>. It enables powerful patterns like testing with mocks — define an interface matching just the methods you use, and any type with those methods works."
    },
    {
     "q": "What are the anti-patterns with empty interface (any)?",
     "a": "<code>any</code> (alias for <code>interface{}</code>) accepts all types but loses type safety. Anti-patterns: (1) Using <code>map[string]any</code> as a generic struct — use proper typed structs instead. (2) Function parameters as <code>any</code> — use generics or specific interfaces. (3) Storing everything as <code>any</code> in collections — use typed slices. The empty interface should be reserved for truly dynamic scenarios: JSON parsing of unknown schemas, reflection-based frameworks, Printf-style variadic functions. With Go 1.18+ generics, most <code>any</code> usage should be replaced with type parameters."
    },
    {
     "q": "Error wrapping vs custom error types — when to use each?",
     "a": "<strong>Wrapping</strong> (<code>fmt.Errorf(\"%w\", err)</code>): adds context to an existing error while preserving the chain. Use when you want callers to check the original error with <code>errors.Is()</code>. <strong>Custom types</strong>: create when you need to carry structured data (field name, HTTP status, error code). Custom types implement the <code>error</code> interface and callers extract them with <code>errors.As()</code>. Rule of thumb: wrap for adding 'where it happened' context, custom types for 'what specifically went wrong' with actionable data."
    },
    {
     "q": "How does Go achieve polymorphism without inheritance?",
     "a": "Go uses <strong>composition over inheritance</strong>. (1) <strong>Struct embedding</strong> promotes fields and methods from embedded types, providing code reuse. (2) <strong>Interface composition</strong> (<code>io.ReadWriter = io.Reader + io.Writer</code>) combines behaviors. (3) <strong>Implicit interface satisfaction</strong> enables any type with the right methods to be used polymorphically. The benefit: no fragile base class problem, no diamond inheritance, clear and explicit relationships. If Dog has a Speak() method and Cat has a Speak(), they both satisfy Speaker interface without knowing about each other."
    }
   ],
   "quiz": [
    {
     "q": "Interfaces?",
     "a": "Satisfied implicitly."
    },
    {
     "q": "Empty interface?",
     "a": "any — satisfied by all types."
    },
    {
     "q": "Type assertion?",
     "a": "value, ok := iface.(Type)"
    },
    {
     "q": "Error wrapping?",
     "a": "fmt.Errorf(\"%w\", err)"
    },
    {
     "q": "Is vs As?",
     "a": "Is: match. As: extract typed."
    },
    {
     "q": "Value vs pointer receiver?",
     "a": "Value: copy. Pointer: original."
    },
    {
     "q": "Pointer receiver when?",
     "a": "Modify, avoid copying, consistency."
    },
    {
     "q": "Composition?",
     "a": "Embedding promotes fields/methods."
    },
    {
     "q": "Custom error?",
     "a": "Implement Error() string."
    },
    {
     "q": "io.Reader?",
     "a": "Read(p []byte) (int, error)"
    }
   ],
   "resources": [
    {
     "title": "justforfunc: Methods",
     "url": "https://www.youtube.com/c/JustForFunc",
     "type": "video"
    },
    {
     "title": "Go: Structs & Interfaces",
     "url": "https://www.youtube.com/watch?v=un6ZyFkqFKo",
     "type": "video"
    },
    {
     "title": "Go Blog — Working with Errors in Go 1.13",
     "url": "https://go.dev/blog/go1.13-errors",
     "type": "article"
    },
    {
     "title": "Effective Go — Interfaces",
     "url": "https://go.dev/doc/effective_go#interfaces",
     "type": "docs"
    }
   ]
  },
  {
   "n": 4,
   "title": "Advanced Features & Reflection",
   "group": "Core Go (Weeks 1–8)",
   "topics": [
    {
     "title": "Reflection: reflect package",
     "def": "The <code>reflect</code> package provides <strong>runtime type examination and manipulation</strong> — the ability to inspect and modify program structure at runtime. Go's reflection is built on two key types:<br><br><code>reflect.Type</code> (from <code>reflect.TypeOf(v)</code>): provides type metadata — name, kind (struct/slice/map/etc.), fields, methods, tags. This is read-only information about the type itself.<br><br><code>reflect.Value</code> (from <code>reflect.ValueOf(v)</code>): represents the actual value and allows reading and (conditionally) modifying it. To modify a value, you must pass a pointer: <code>reflect.ValueOf(&v).Elem().SetInt(42)</code>. A value is settable only if it was created from an addressable variable.<br><br><strong>Performance:</strong> Reflection is typically <strong>one to two orders of magnitude slower</strong> than direct access. It uses runtime type lookups, boxes values into interfaces (which often allocates), defeats inlining and escape analysis, and repeats checks the compiler would normally do once. Measure the cost in your own benchmark rather than quoting a fixed factor. Never use reflection in hot paths (per-request handling, tight loops).<br><br><strong>Common uses:</strong> JSON/XML marshaling (<code>encoding/json</code> uses reflection internally), ORM field mapping, dependency injection, validation frameworks, test assertions, and code generation tools. <strong>Struct tags</strong> are accessed via reflection: <code>field.Tag.Get(\"json\")</code>.<br><br><strong>Limitations:</strong> Cannot access unexported fields from other packages. Cannot create new types at runtime (unlike some dynamic languages). With Go 1.18+ generics, many former uses of reflection can be replaced with type-safe generic code.<br><br><strong>Newer APIs:</strong> <code>reflect.TypeFor[T]()</code> (Go 1.22) replaces <code>reflect.TypeOf((*T)(nil)).Elem()</code>; Go 1.26 adds iterator methods such as <code>for f := range t.Fields()</code>, <code>t.Methods()</code> and <code>v.Fields()</code>. Cache per-type metadata (field indexes, parsed tags) in a <code>sync.Map</code> keyed by <code>reflect.Type</code>, as <code>encoding/json</code> does, so that reflection runs once per type rather than once per value.",
     "interview": "'Performance impact?' — Often 10-100x slower than direct access (lookups, allocations, no inlining); cache per-type metadata and measure. Use only for serialization, DI, testing. 'When to use reflection vs generics?' — Generics for type-safe containers/algorithms, reflection for dynamic field access and struct tags. 'CanSet?' — Only settable if created from pointer via Elem(). 'How does encoding/json work?' — Uses reflection to read struct tags and field values.",
     "examples": [
      {
       "label": "Inspect struct fields and tags",
       "lang": "go",
       "code": "func printFields(v any) {\n    val := reflect.ValueOf(v)\n    if val.Kind() == reflect.Ptr { val = val.Elem() }\n    typ := val.Type()\n    for i := 0; i < typ.NumField(); i++ {\n        f := typ.Field(i)\n        tag := f.Tag.Get(\"json\")\n        fmt.Printf(\"%s (%s) json:%q = %v\\n\",\n            f.Name, f.Type, tag, val.Field(i))\n    }\n}\n\ntype User struct {\n    Name  string `json:\"name\"`\n    Email string `json:\"email,omitempty\"`\n}\nprintFields(User{\"Alice\", \"alice@example.com\"})\n// Name (string) json:\"name\" = Alice\n// Email (string) json:\"email,omitempty\" = alice@example.com"
      },
      {
       "label": "Modify values via reflection",
       "lang": "go",
       "code": "func setField(obj any, field string, val any) error {\n    v := reflect.ValueOf(obj)\n    if v.Kind() != reflect.Ptr { return errors.New(\"must pass pointer\") }\n    v = v.Elem()\n    f := v.FieldByName(field)\n    if !f.IsValid() { return fmt.Errorf(\"field %q not found\", field) }\n    if !f.CanSet() { return fmt.Errorf(\"field %q not settable\", field) }\n    f.Set(reflect.ValueOf(val))\n    return nil\n}\n\nvar u User\nsetField(&u, \"Name\", \"Bob\")  // u.Name is now \"Bob\""
      }
     ]
    },
    {
     "title": "Generics: type parameters, constraints",
     "def": "Generics (introduced in Go 1.18) add <strong>type parameters</strong> to functions and types, enabling you to write code that works with multiple types while maintaining full <strong>compile-time type safety</strong> — no type assertions, no <code>interface{}</code> casting.<br><br><strong>Syntax:</strong> <code>func Name[T Constraint](param T) T</code>. Type parameters appear in square brackets before the regular parameters. Multiple type params: <code>func Convert[S, T any](s S) T</code>.<br><br><strong>Constraints</strong> define what operations are allowed on a type parameter. They are interfaces:<br>• <code>any</code> — accepts all types (alias for <code>interface{}</code>)<br>• <code>comparable</code> — types that support <code>==</code> and <code>!=</code> (required for map keys)<br>• Custom: <code>interface{ int | float64 | string }</code> — union of specific types<br>• <code>~int</code> — the tilde means 'any type whose underlying type is int' (includes <code>type MyInt int</code>)<br><br><strong>When to use generics vs interfaces:</strong><br>• <strong>Generics</strong>: the algorithm is the same, only the data type varies (containers, sorting, Map/Filter/Reduce, type-safe collections)<br>• <strong>Interfaces</strong>: different types need different implementations (polymorphism, strategy pattern, dependency injection)<br><br><strong>Limitations:</strong> before Go 1.27, methods could not declare their own type parameters (only functions and types could); Go 1.27 adds <strong>generic methods</strong>, e.g. <code>func (b Box) Map[T any](f func(int) T) T</code>, but interface methods still cannot have type parameters, so a generic method never satisfies an interface. There is no specialization (no special implementation for one specific type), and type inference works from arguments but cannot infer a type parameter that appears only in the result.<br><br><strong>Recent changes:</strong> built-in <code>min</code>, <code>max</code> and <code>clear</code> (1.21); the <code>cmp</code> package (<code>cmp.Ordered</code>, <code>cmp.Compare</code>) replaces <code>golang.org/x/exp/constraints</code>; generic type aliases such as <code>type Set[T comparable] = map[T]struct{}</code> (1.24); Go 1.25 removed the spec's notion of <em>core types</em>, which simplified the rules without changing most programs; and Go 1.26 lets a type parameter refer to itself in its own constraint (<code>type Adder[A Adder[A]] interface{ Add(A) A }</code>).<br><br><strong>Constraint gotchas:</strong> an interface that contains a type union (<code>~int | ~float64</code>) can only be used as a constraint, never as an ordinary variable type. Since Go 1.20, interface types satisfy <code>comparable</code>, so <code>==</code> can still panic at run time if the dynamic type is not comparable.<br><br><strong>How it compiles:</strong> the gc compiler uses <em>GC-shape stenciling with dictionaries</em>. It emits one copy of the code per memory shape (all pointer types share one shape) and passes a dictionary at run time. A method called through a type parameter can therefore be an indirect call that is not inlined, so generic code is not automatically as fast as hand-specialized code, and hot paths should be benchmarked.",
     "interview": "'Generics vs interfaces?' — Generics: same algorithm, different types. Interfaces: different behavior, polymorphism. 'What is ~?' — Underlying type match: ~int matches type MyInt int. 'comparable?' — Types supporting == and != (map keys); interfaces satisfy it since 1.20 but may panic at run time. 'Limitations?' — No specialization, interface methods cannot be generic, inference cannot use results; generic methods arrived only in Go 1.27. 'How are generics compiled?' — GC-shape stenciling plus dictionaries: one instantiation per memory shape, so calls through type-parameter methods may be indirect; benchmark hot paths.",
     "examples": [
      {
       "label": "Generic data structures",
       "lang": "go",
       "code": "type Stack[T any] struct { items []T }\n\nfunc (s *Stack[T]) Push(v T) {\n    s.items = append(s.items, v)\n}\n\nfunc (s *Stack[T]) Pop() (T, bool) {\n    if len(s.items) == 0 {\n        var zero T\n        return zero, false  // return zero value\n    }\n    v := s.items[len(s.items)-1]\n    s.items = s.items[:len(s.items)-1]\n    return v, true\n}\n\n// Usage — fully type-safe\nintStack := &Stack[int]{}\nintStack.Push(42)\nval, ok := intStack.Pop()  // val is int, not interface{}"
      },
      {
       "label": "Generic functions and constraints",
       "lang": "go",
       "code": "// Map — transform a slice\nfunc Map[T, U any](s []T, fn func(T) U) []U {\n    r := make([]U, len(s))\n    for i, v := range s { r[i] = fn(v) }\n    return r\n}\nnames := Map(users, func(u User) string { return u.Name })\n\n// Custom constraint with tilde\ntype Numeric interface {\n    ~int | ~int64 | ~float64\n}\n\nfunc Sum[T Numeric](vals []T) T {\n    var total T\n    for _, v := range vals { total += v }\n    return total\n}\n\ntype Dollars float64\nprices := []Dollars{9.99, 19.99, 4.99}\ntotal := Sum(prices)  // works! Dollars underlying type is float64"
      }
     ]
    },
    {
     "title": "Type system: aliases, conversions",
     "def": "Go's type system is a core strength for writing safe, self-documenting code. It provides two mechanisms for creating types:<br><br><strong>Type definitions</strong> (<code>type UserID int64</code>): creates a <strong>completely new, distinct type</strong>. Even though <code>UserID</code> has the same underlying type as <code>int64</code>, they are NOT interchangeable — you cannot pass a <code>UserID</code> where an <code>int64</code> is expected without explicit conversion. This is powerful for <strong>domain modeling</strong>: <code>type UserID int64</code> and <code>type OrderID int64</code> prevent accidentally mixing user IDs and order IDs, even though both are int64 underneath. Defined types can also have <strong>methods attached</strong>: <code>func (u UserID) String() string</code>.<br><br><strong>Type aliases</strong> (<code>type Celsius = float64</code>): creates an <strong>alternative name</strong> for an existing type — they are <em>fully interchangeable</em>. Aliases were introduced in Go 1.9 primarily for <strong>large-scale refactoring</strong> (e.g., moving <code>io.ByteReader</code> without breaking consumers). You cannot attach methods to an alias from an external package.<br><br><strong>Type conversions:</strong> Go requires <strong>explicit conversions</strong> between types, even between compatible ones like <code>int</code> and <code>int64</code>. This is intentional — it prevents bugs from implicit coercion (a common issue in C and JavaScript). Conversions between numeric types may lose precision (e.g., <code>int(3.14)</code> truncates to <code>3</code>). String/byte conversions: <code>[]byte(str)</code> and <code>string(bytes)</code> are copies (not free).<br><br><strong>Type assertions vs type conversions:</strong> Assertions are for interfaces (<code>iface.(ConcreteType)</code>), conversions are between compatible concrete types (<code>float64(myInt)</code>). This distinction is important in interviews.",
     "interview": "'Type definition vs alias?' — Definition: new distinct type, supports methods, prevents mixing. Alias: same type, different name, for refactoring. 'Why custom types?' — Type safety (UserID vs OrderID), method attachment, self-documenting. 'Assertion vs conversion?' — Assertion: interface → concrete. Conversion: concrete → concrete. 'String to bytes cost?' — []byte(str) creates a copy. Not free.",
     "examples": [
      {
       "label": "Custom types vs aliases",
       "lang": "go",
       "code": "// Type definition — NEW distinct type\ntype UserID int64\ntype Temperature float64\n\nvar uid UserID = 42\n// var n int64 = uid  // ERROR: different types\nvar n int64 = int64(uid)  // explicit conversion\n\n// Type alias — same type, different name\ntype Celsius = float64\nvar temp Celsius = 36.6\nvar f float64 = temp  // OK: same type\n\n// Methods on custom types\nfunc (t Temperature) IsFreezing() bool { return t <= 0 }"
      }
     ]
    },
    {
     "title": "Build tags: conditional compilation",
     "def": "Build tags (also called build constraints) control <strong>which files are included during compilation</strong>, enabling conditional compilation without preprocessor macros. This is Go's mechanism for platform-specific code, feature toggles, and test isolation.<br><br><strong>Syntax (Go 1.17+):</strong> <code>//go:build linux</code> — must be on the first line (before package), followed by a blank line. The legacy syntax <code>// +build linux</code> is still supported but deprecated. The modern syntax is Go expression-based with clear boolean operators.<br><br><strong>Boolean expressions:</strong><br>• AND: <code>//go:build linux && amd64</code> — include only on Linux+AMD64<br>• OR: <code>//go:build linux || darwin</code> — include on Linux or macOS<br>• NOT: <code>//go:build !windows</code> — include everywhere except Windows<br>• Complex: <code>//go:build (linux || darwin) && amd64</code><br><br><strong>Custom tags:</strong> You can define your own tags for feature flags or test categories: <code>//go:build integration</code>. Build with <code>go test -tags=integration ./...</code>. This is the standard way to separate unit tests from integration tests in Go projects. You can also use tags like <code>//go:build debug</code> for debug-only code.<br><br><strong>Predefined tags:</strong> Go automatically provides tags for OS (<code>linux</code>, <code>darwin</code>, <code>windows</code>), architecture (<code>amd64</code>, <code>arm64</code>), compiler (<code>gc</code>, <code>gccgo</code>), CGO (<code>cgo</code>), and Go version (<code>go1.21</code>).",
     "interview": "'Modern vs legacy syntax?' — //go:build (Go 1.17+) with boolean expressions vs // +build (deprecated). 'Custom tags?' — //go:build integration + go test -tags=integration. 'Separate unit from integration tests?' — Build tags are the standard approach. 'Predefined tags?' — OS, arch, compiler, cgo, Go version.",
     "examples": [
      {
       "label": "Build tags",
       "lang": "go",
       "code": "//go:build linux\npackage main\nfunc platform() string { return \"Linux\" }\n\n//go:build windows\npackage main\nfunc platform() string { return \"Windows\" }\n\n// Combined constraint\n//go:build linux && amd64\npackage optimized"
      }
     ]
    },
    {
     "title": "Build constraints: file naming",
     "def": "Go uses <strong>file naming conventions</strong> as an alternative to explicit build tags for common cases. The Go toolchain inspects file names and automatically applies constraints:<br><br><strong>OS-specific:</strong> Files named <code>*_GOOS.go</code> are compiled only for the matching OS: <code>server_linux.go</code> (Linux only), <code>server_windows.go</code> (Windows only), <code>server_darwin.go</code> (macOS only). No build tag annotation needed — the filename IS the constraint.<br><br><strong>Architecture-specific:</strong> Files named <code>*_GOARCH.go</code>: <code>math_amd64.go</code>, <code>math_arm64.go</code>. Can combine: <code>file_linux_amd64.go</code> (Linux AND AMD64).<br><br><strong>Test files:</strong> <code>*_test.go</code> files are <strong>only compiled during <code>go test</code></strong>. Test functions must start with <code>Test</code>, <code>Fuzz</code> (Go 1.18), <code>Benchmark</code>, or <code>Example</code>. External test packages (e.g., <code>package foo_test</code>) test the public API only — useful for avoiding circular imports and testing from the consumer's perspective.<br><br><strong>Ignored files:</strong> Files starting with <code>_</code> or <code>.</code> are always ignored by the Go toolchain.<br><br><strong>When to use which:</strong> File naming is simpler and preferred for straightforward OS/arch selection — it's self-documenting (you see the constraint in the file name). Build tags are needed for: complex boolean expressions, custom feature flags, test categories, Go version constraints, and negation (<code>!windows</code>).",
     "interview": "'File naming vs build tags?' — File naming: simple OS/arch, self-documenting. Build tags: complex conditions, custom flags, boolean logic. 'Test files?' — *_test.go only compiled during go test. 'External test package?' — package foo_test tests public API, avoids circular imports. 'Ignored files?' — Leading _ or . are always ignored.",
     "examples": [
      {
       "label": "File naming patterns",
       "lang": "go",
       "code": "// Automatic OS selection:\n// server_linux.go   → only on Linux\n// server_windows.go → only on Windows\n// server_darwin.go  → only on macOS\n\n// Architecture:\n// math_amd64.go → only on AMD64\n// math_arm64.go → only on ARM64\n\n// Test files:\n// calc_test.go → only during go test\n\n// Ignored files:\n// doc.go       → typically documentation only\n// _ignored.go  → never compiled (leading _)"
      }
     ]
    },
    {
     "title": "Iterators: range-over-func, iter.Seq and the slices/maps packages",
     "def": "Go 1.23 lets <code>for range</code> loop over <strong>iterator functions</strong>, so custom collections, trees, paginated APIs and database cursors can be consumed exactly like a slice.<br><br><strong>The three shapes</strong> (all <em>push</em> iterators: the iterator calls the loop body):<br>• <code>func(yield func() bool)</code><br>• <code>func(yield func(V) bool)</code>, named <code>iter.Seq[V]</code><br>• <code>func(yield func(K, V) bool)</code>, named <code>iter.Seq2[K, V]</code><br>The compiler turns the loop body into the <code>yield</code> function. <code>yield</code> returns <strong>false</strong> when the loop exits early (<code>break</code>, <code>return</code>, <code>goto</code> or a panic), and the iterator <strong>must stop</strong> at that point; calling <code>yield</code> again panics at run time. <code>defer</code> inside the loop body still belongs to the enclosing function.<br><br><strong>Pull iterators:</strong> <code>next, stop := iter.Pull(seq)</code> converts a push iterator into a <code>next()</code> function, which is useful for zipping or merging two sequences. Always call <code>stop()</code> (usually with <code>defer</code>), or the paused iterator is never released.<br><br><strong>Standard library:</strong><br>• <code>slices.All</code>, <code>Values</code>, <code>Backward</code>, <code>Collect</code>, <code>AppendSeq</code>, <code>Sorted</code>, <code>SortedFunc</code>, <code>Chunk</code><br>• <code>maps.Keys</code>, <code>Values</code>, <code>All</code>, <code>Collect</code>, <code>Insert</code><br>• Go 1.24: <code>strings.Lines</code>, <code>SplitSeq</code>, <code>FieldsSeq</code> (and the same in <code>bytes</code>), which iterate without allocating a <code>[]string</code><br>• Go 1.26: <code>reflect.Type.Fields()</code> / <code>Methods()</code><br><br><strong>Errors:</strong> use <code>iter.Seq2[T, error]</code> and yield the error as the final element, or expose an <code>Err()</code> method in the style of <code>bufio.Scanner</code>.<br><br><strong>Iterators vs channels as generators:</strong> an iterator is an ordinary function call with no goroutine, no channel synchronisation and nothing to leak, and it is usually inlined to roughly the speed of a hand-written loop. A channel generator needs a goroutine and cancellation, and leaks if the consumer stops early. Prefer iterators for sequential traversal and channels for real concurrency.<br><br><strong>Design notes:</strong> return iterators from methods (<code>func (t *Tree[T]) All() iter.Seq[T]</code>). Document whether an iterator is single-use (a network stream) or can be ranged over again (an in-memory tree). Do not mutate the underlying collection during iteration unless that is documented as safe.",
     "interview": "'What is range-over-func?' — Go 1.23: range accepts func(yield func(V) bool) (iter.Seq) and the K,V form (iter.Seq2); the loop body becomes yield. 'What happens on break?' — yield returns false and the iterator must return; calling yield again panics. 'Push vs pull?' — Push: the iterator drives the loop. Pull (iter.Pull): you call next(), and you must call stop(). 'Iterator vs channel generator?' — No goroutine and no leak, much cheaper; channels are for actual concurrency. 'Errors?' — Seq2[T, error] or an Err() method. 'Stdlib helpers?' — slices.Collect/Sorted, maps.Keys/Values, strings.SplitSeq/Lines (1.24).",
     "examples": [
      {
       "label": "A tree iterator and a paginated API iterator",
       "lang": "go",
       "code": "type Tree[T any] struct {\n    Left, Right *Tree[T]\n    Val         T\n}\n\n// All yields values in order and stops as soon as yield returns false.\nfunc (t *Tree[T]) All() iter.Seq[T] {\n    return func(yield func(T) bool) { t.push(yield) }\n}\n\nfunc (t *Tree[T]) push(yield func(T) bool) bool {\n    if t == nil {\n        return true\n    }\n    return t.Left.push(yield) && yield(t.Val) && t.Right.push(yield)\n}\n\n// Paginate hides paging behind a (value, error) iterator.\nfunc Paginate(ctx context.Context) iter.Seq2[Item, error] {\n    return func(yield func(Item, error) bool) {\n        token := \"\"\n        for {\n            page, err := fetchPage(ctx, token)\n            if err != nil {\n                yield(Item{}, err)\n                return\n            }\n            for _, it := range page.Items {\n                if !yield(it, nil) {\n                    return // consumer broke out of the loop\n                }\n            }\n            if page.Next == \"\" {\n                return\n            }\n            token = page.Next\n        }\n    }\n}\n\n// Usage\nfor v := range tree.All() {\n    if v > 5 {\n        break // yield returns false, push unwinds\n    }\n    fmt.Println(v)\n}\nfor it, err := range Paginate(ctx) {\n    if err != nil {\n        return err\n    }\n    process(it)\n}"
      },
      {
       "label": "Standard library iterators and iter.Pull",
       "lang": "go",
       "code": "ages := map[string]int{\"bob\": 25, \"alice\": 30}\n\n// Sorted keys in one line (Go 1.23)\nfor _, name := range slices.Sorted(maps.Keys(ages)) {\n    fmt.Println(name, ages[name])\n}\n\n// Collect an iterator into a slice\nvals := slices.Collect(tree.All()) // [2 5 9]\n\n// Split without allocating a []string (Go 1.24)\nfor part := range strings.SplitSeq(\"a,b,c\", \",\") {\n    fmt.Print(part, \" \")\n}\n\n// Pull style: drive the iterator yourself\nnext, stop := iter.Pull(tree.All())\ndefer stop() // always release the paused iterator\na, ok1 := next()\nb, ok2 := next()\nfmt.Println(a, ok1, b, ok2) // 2 true 5 true"
      }
     ]
    },
    {
     "title": "Testing in Go: table-driven tests, fuzzing, benchmarks & testing/synctest",
     "def": "Go's <code>testing</code> package and <code>go test</code> cover unit tests, benchmarks, fuzzing, examples and coverage with no framework. Interviewers expect idiomatic table-driven tests and the ability to test concurrent and time-dependent code deterministically.<br><br><strong>Table-driven tests:</strong> a slice of cases and one <code>t.Run(tc.name, ...)</code> subtest per case. Since Go 1.22 the loop variable is per-iteration, so <code>t.Parallel()</code> inside a subtest no longer needs <code>tc := tc</code>. Useful helpers: <code>t.Helper()</code> (report failures at the caller's line), <code>t.Cleanup</code>, <code>t.TempDir</code>, <code>t.Setenv</code>, <code>t.Context()</code> and <code>t.Chdir</code> (Go 1.24), <code>t.Output()</code> and <code>t.Attr</code> (Go 1.25), and <code>t.ArtifactDir()</code> (Go 1.26). Use <code>net/http/httptest</code> for handlers and clients, and <code>cmp.Diff</code> (go-cmp) for readable diffs.<br><br><strong>Fuzzing (Go 1.18):</strong> write <code>func FuzzX(f *testing.F)</code>, add seeds with <code>f.Add</code>, and assert <em>properties</em> such as no panic, round-trip equality or agreement with a reference implementation. <code>go test -fuzz=FuzzX -fuzztime=30s</code> mutates inputs with coverage guidance. Failing inputs are saved in <code>testdata/fuzz/FuzzX/</code> and run as ordinary regression tests from then on. Fuzz parsers, decoders and anything that handles untrusted input.<br><br><strong>Benchmarks:</strong> <code>for b.Loop() { ... }</code> (Go 1.24) replaces <code>for i := 0; i &lt; b.N; i++</code>. Setup outside the loop is excluded from timing automatically, and the compiler cannot optimize the body away. Run with <code>-benchmem -count=10</code> and compare runs with <code>benchstat</code>.<br><br><strong>testing/synctest (Go 1.25; experimental in 1.24):</strong> <code>synctest.Test(t, func(t *testing.T) {...})</code> runs the function in a <em>bubble</em> with a fake clock. Time advances only when every goroutine in the bubble is durably blocked, so a test of a 5-second timeout runs instantly and deterministically. <code>synctest.Wait()</code> waits until the other goroutines in the bubble are blocked. If goroutines are still blocked when the test function returns, <code>Test</code> fails with a deadlock, which turns <strong>goroutine leaks into test failures</strong>.<br><br><strong>Always:</strong> run <code>go test -race ./...</code> in CI, try <code>-shuffle=on</code> to catch order dependence, use <code>-cover</code>/<code>-coverprofile</code>, and keep slow integration tests behind a build tag or <code>testing.Short()</code>.",
     "interview": "'How do you structure tests?' — Table-driven cases plus t.Run subtests; t.Parallel where safe; t.Helper in assertion helpers. 'How do you test timeouts and retries without sleeping?' — testing/synctest (Go 1.25): a fake clock inside a bubble; time jumps when all goroutines are blocked, and leftover blocked goroutines fail the test as a deadlock. 'What is fuzzing good for?' — Finding panics and property violations in parsers and decoders; failing inputs become regression tests in testdata/fuzz. 'Modern benchmarks?' — for b.Loop() (Go 1.24), -benchmem, -count and benchstat.",
     "examples": [
      {
       "label": "Table-driven test and fuzz test",
       "lang": "go",
       "code": "func TestParseKV(t *testing.T) {\n    tests := []struct {\n        name    string\n        in      string\n        want    map[string]string\n        wantErr bool\n    }{\n        {\"empty\", \"\", map[string]string{}, false},\n        {\"two\", \"a=1;b=2\", map[string]string{\"a\": \"1\", \"b\": \"2\"}, false},\n        {\"missing equals\", \"a\", nil, true},\n    }\n    for _, tc := range tests {\n        t.Run(tc.name, func(t *testing.T) {\n            t.Parallel() // Go 1.22+: tc is per-iteration\n            got, err := ParseKV(tc.in)\n            if (err != nil) != tc.wantErr {\n                t.Fatalf(\"ParseKV(%q) err = %v, wantErr %v\", tc.in, err, tc.wantErr)\n            }\n            if !tc.wantErr && !maps.Equal(got, tc.want) {\n                t.Errorf(\"ParseKV(%q) = %v, want %v\", tc.in, got, tc.want)\n            }\n        })\n    }\n}\n\nfunc FuzzParseKV(f *testing.F) {\n    f.Add(\"a=1;b=2\") // seed; failures land in testdata/fuzz/FuzzParseKV\n    f.Fuzz(func(t *testing.T, s string) {\n        m, err := ParseKV(s)\n        if err != nil {\n            return // invalid input is fine; it just must not panic\n        }\n        again, err := ParseKV(Format(m)) // property: round trip\n        if err != nil || !maps.Equal(m, again) {\n            t.Fatalf(\"round trip failed for %q\", s)\n        }\n    })\n}\n// go test -fuzz=FuzzParseKV -fuzztime=30s"
      },
      {
       "label": "Deterministic timeout test with synctest + b.Loop benchmark",
       "lang": "go",
       "code": "func TestWaitReadyTimeout(t *testing.T) {\n    synctest.Test(t, func(t *testing.T) { // Go 1.25+\n        ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)\n        defer cancel()\n        start := time.Now()\n        err := WaitReady(ctx, time.Second, func() bool { return false })\n        if !errors.Is(err, context.DeadlineExceeded) {\n            t.Fatalf(\"err = %v, want DeadlineExceeded\", err)\n        }\n        // Fake clock: exactly 5s \"passed\", but the test ran instantly.\n        if got := time.Since(start); got != 5*time.Second {\n            t.Fatalf(\"elapsed %v, want 5s\", got)\n        }\n    })\n}\n\nfunc BenchmarkParseKV(b *testing.B) {\n    in := strings.Repeat(\"key=value;\", 50) + \"k=v\" // setup: not timed\n    for b.Loop() { // Go 1.24+\n        if _, err := ParseKV(in); err != nil {\n            b.Fatal(err)\n        }\n    }\n}\n// go test -run=^$ -bench=ParseKV -benchmem -count=10 | tee new.txt\n// benchstat old.txt new.txt"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Generic filter",
     "type": "coding",
     "solution": "func Filter[T any](s []T, fn func(T) bool) []T {\n    r := []T{}\n    for _, v := range s { if fn(v) { r = append(r, v) } }\n    return r\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/filter-elements-from-array/",
     "ex": "https://exercism.org/tracks/go/exercises/strain"
    },
    {
     "t": "Generic reducer",
     "type": "coding",
     "url": "https://leetcode.com/problems/running-sum-of-1d-array/"
    },
    {
     "t": "Type-safe config",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/booking-up-for-beauty"
    },
    {
     "t": "Generic cache",
     "type": "coding",
     "url": "https://leetcode.com/problems/lru-cache/"
    },
    {
     "t": "Generic repo",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Reflection mapper",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/strain"
    },
    {
     "t": "Dynamic caller",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    },
    {
     "t": "Generic JSON",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/booking-up-for-beauty"
    },
    {
     "t": "Generic comparator",
     "type": "coding",
     "url": "https://leetcode.com/problems/sort-an-array/"
    },
    {
     "t": "Generic middleware",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Generic max",
     "type": "coding",
     "id": "w4_acode_0",
     "solution": "func Max[T cmp.Ordered](s []T) T {\n    m := s[0]\n    for _, v := range s[1:] { if v > m { m = v } }\n    return m\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/find-the-maximum-achievable-number/"
    },
    {
     "t": "Generic stack",
     "type": "coding",
     "id": "w4_acode_1",
     "solution": "type Stack[T any] struct { items []T }\nfunc (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }\nfunc (s *Stack[T]) Pop() (T, bool) {\n    if len(s.items)==0 { var z T; return z, false }\n    v := s.items[len(s.items)-1]; s.items = s.items[:len(s.items)-1]; return v, true\n}",
     "lang": "go",
     "url": "https://leetcode.com/problems/implement-stack-using-queues/"
    },
    {
     "t": "Reflection fields",
     "type": "coding",
     "id": "w4_acode_2",
     "solution": "func fields(v any) []string {\n    t := reflect.TypeOf(v)\n    if t.Kind() == reflect.Ptr { t = t.Elem() }\n    n := make([]string, t.NumField())\n    for i := range n { n[i] = t.Field(i).Name }\n    return n\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/strain"
    },
    {
     "t": "In-order iterator for a binary search tree (iter.Seq)",
     "d": "medium",
     "type": "coding",
     "hint": "Return <code>iter.Seq[T]</code> from a method. Recurse left, yield, then recurse right, and <strong>propagate</strong> the boolean from <code>yield</code> so that a <code>break</code> in the caller stops the whole traversal; calling <code>yield</code> after it returned false panics. Then add <code>Backward()</code> and a <code>Range(lo, hi)</code> that prunes subtrees. Test early exit with <code>slices.Collect</code> and a loop that breaks.",
     "lang": "go",
     "solution": "type Tree[T cmp.Ordered] struct {\n    root *node[T]\n}\n\ntype node[T cmp.Ordered] struct {\n    left, right *node[T]\n    val         T\n}\n\nfunc (t *Tree[T]) Insert(v T) {\n    p := &t.root\n    for *p != nil {\n        if v < (*p).val {\n            p = &(*p).left\n        } else {\n            p = &(*p).right\n        }\n    }\n    *p = &node[T]{val: v}\n}\n\n// All yields values in ascending order.\nfunc (t *Tree[T]) All() iter.Seq[T] {\n    return func(yield func(T) bool) { inorder(t.root, yield) }\n}\n\nfunc inorder[T cmp.Ordered](n *node[T], yield func(T) bool) bool {\n    if n == nil {\n        return true\n    }\n    return inorder(n.left, yield) && yield(n.val) && inorder(n.right, yield)\n}\n\n// Range yields values in [lo, hi], skipping subtrees that cannot match.\nfunc (t *Tree[T]) Range(lo, hi T) iter.Seq[T] {\n    var walk func(n *node[T], yield func(T) bool) bool\n    walk = func(n *node[T], yield func(T) bool) bool {\n        if n == nil {\n            return true\n        }\n        if lo < n.val && !walk(n.left, yield) {\n            return false\n        }\n        if lo <= n.val && n.val <= hi && !yield(n.val) {\n            return false\n        }\n        if n.val < hi {\n            return walk(n.right, yield)\n        }\n        return true\n    }\n    return func(yield func(T) bool) { walk(t.root, yield) }\n}\n\n// var t Tree[int]; for _, v := range []int{5, 2, 8, 1, 9} { t.Insert(v) }\n// slices.Collect(t.All())        -> [1 2 5 8 9]\n// slices.Collect(t.Range(2, 8))  -> [2 5 8]"
    },
    {
     "t": "Test a retry loop deterministically with testing/synctest",
     "d": "medium",
     "type": "hands-on",
     "hint": "Write <code>Retry(ctx, attempts, base, fn)</code> with exponential backoff and a <code>time.Timer</code> per wait. In the test, wrap everything in <code>synctest.Test</code> and assert that the fake clock advanced by exactly the expected backoff total (<code>time.Since(start)</code>), that cancelling the context stops further attempts, and that no goroutines are left behind (a leftover blocked goroutine fails <code>synctest.Test</code> with a deadlock). Running it under <code>go test -race -count=100</code> should stay fast and never flake.",
     "lang": "go",
     "solution": "func Retry(ctx context.Context, attempts int, base time.Duration, fn func() error) error {\n    var err error\n    for i := range attempts {\n        if err = fn(); err == nil {\n            return nil\n        }\n        if i == attempts-1 {\n            break\n        }\n        t := time.NewTimer(base << i) // 1x, 2x, 4x ...\n        select {\n        case <-t.C:\n        case <-ctx.Done():\n            t.Stop()\n            return errors.Join(err, ctx.Err())\n        }\n    }\n    return err\n}\n\nfunc TestRetryBackoff(t *testing.T) {\n    synctest.Test(t, func(t *testing.T) {\n        calls := 0\n        start := time.Now()\n        err := Retry(t.Context(), 4, 100*time.Millisecond, func() error {\n            calls++\n            return errors.New(\"unavailable\")\n        })\n        if err == nil || calls != 4 {\n            t.Fatalf(\"calls=%d err=%v\", calls, err)\n        }\n        // 100 + 200 + 400 ms of fake time, zero real waiting\n        if got := time.Since(start); got != 700*time.Millisecond {\n            t.Fatalf(\"elapsed %v\", got)\n        }\n    })\n}"
    }
   ],
   "interviewFocus": [
    {
     "q": "Generics vs interfaces — when should you use each?",
     "a": "<strong>Generics</strong> (type parameters): use when the <em>algorithm is the same</em> but the <em>data type varies</em>. Examples: containers (Stack[T], Queue[T]), utility functions (Map, Filter, Reduce), type-safe collections. <strong>Interfaces</strong>: use when the <em>behavior differs</em> across types. Examples: different storage backends (DB, file, memory), different notification strategies (email, SMS, push). Rule of thumb: if you're writing the same code for different types → generics. If different types need different implementations → interfaces."
    },
    {
     "q": "What is the performance impact of reflection in Go?",
     "a": "Reflection is typically <strong>10–100x slower</strong> than direct field access (the exact factor depends on the operation, so benchmark it). <code>reflect.ValueOf()</code> allocates on the heap and involves type lookups at runtime. Use reflection only for: JSON/XML marshaling, ORM field mapping, dependency injection frameworks, test assertions, and code generation tools. Never use reflection in hot paths (request handling loops, data processing pipelines). Mitigations: cache per-type metadata (field indexes, parsed tags) the first time a type is seen. Alternative: use code generation (<code>go generate</code>) to produce type-specific code at build time. In interviews, mention that the standard library uses reflection internally (encoding/json, fmt.Printf) but it's abstracted away."
    },
    {
     "q": "How does Go's type system prevent bugs compared to dynamic languages?",
     "a": "Go's type system provides safety through: (1) <strong>Static typing</strong> — all type errors caught at compile time. (2) <strong>No implicit conversions</strong> — must explicitly convert int to float64. (3) <strong>Custom type definitions</strong> — <code>type UserID int64</code> prevents accidentally mixing UserID with OrderID even though both are int64. (4) <strong>Nil safety</strong> through explicit pointer types. (5) <strong>Interface satisfaction</strong> checked at compile time. This catches entire categories of bugs before the code runs, unlike Python/JavaScript where type errors surface only at runtime."
    },
    {
     "q": "When would you use build tags vs file naming conventions?",
     "a": "<strong>File naming</strong> (<code>_linux.go</code>, <code>_amd64.go</code>): use for simple OS/architecture selection. It's the Go convention and requires no special syntax. <strong>Build tags</strong> (<code>//go:build</code>): use for complex conditions — boolean combinations (<code>linux && amd64</code>), custom flags (<code>//go:build integration</code>), feature toggles. Build tags also work for <code>go test</code> filtering: <code>//go:build integration</code> + <code>go test -tags=integration</code>. In production, use file naming for platform code, build tags for test categories and feature flags."
    },
    {
     "q": "How do range-over-func iterators work, and when would you choose them over a channel-based generator?",
     "a": "Since Go 1.23, <code>for x := range seq</code> accepts functions of the form <code>func(yield func(V) bool)</code> (<code>iter.Seq</code>) or <code>func(yield func(K, V) bool)</code> (<code>iter.Seq2</code>). The compiler rewrites the loop body into the <code>yield</code> callback, so the iterator <em>pushes</em> values into the loop. Early exit makes <code>yield</code> return false, and a correct iterator returns immediately; calling <code>yield</code> again panics. <strong>Versus channels:</strong> an iterator is a plain function call with no goroutine, scheduler hand-off or leak risk if the consumer breaks early, and it is often inlined to near hand-written loop speed. A channel generator costs a goroutine plus synchronisation for every element and needs a cancellation path. Use iterators for traversal (trees, pagination, lazily filtered views) and channels only when producer and consumer must run concurrently. Mention <code>iter.Pull</code> for zipping or merging (always <code>defer stop()</code>), <code>Seq2[T, error]</code> for fallible streams, and the stdlib helpers <code>slices.Collect</code>, <code>slices.Sorted(maps.Keys(m))</code> and <code>strings.SplitSeq</code>."
    }
   ],
   "quiz": [
    {
     "q": "Generics?",
     "a": "Type parameters for type-safe code."
    },
    {
     "q": "Syntax?",
     "a": "func F[T constraint](p T) T"
    },
    {
     "q": "any?",
     "a": "Equivalent to interface{}."
    },
    {
     "q": "comparable?",
     "a": "Types with == and !=."
    },
    {
     "q": "Reflection?",
     "a": "Runtime type examination."
    },
    {
     "q": "Generics vs interfaces?",
     "a": "Generics: containers. Interfaces: behavior."
    },
    {
     "q": "Tilde?",
     "a": "~int includes underlying types."
    },
    {
     "q": "Reflection perf?",
     "a": "Much slower. Use sparingly."
    },
    {
     "q": "What is the signature of an iter.Seq[V]?",
     "a": "func(yield func(V) bool). The loop body becomes yield; it returns false when the loop exits early."
    },
    {
     "q": "What must an iterator do when yield returns false?",
     "a": "Stop and return immediately. Calling yield again panics at run time."
    },
    {
     "q": "How do you get a map's keys in sorted order in Go 1.23+?",
     "a": "slices.Sorted(maps.Keys(m))."
    },
    {
     "q": "What does testing/synctest give you?",
     "a": "A bubble with a fake clock (Go 1.25): time advances only when all bubble goroutines are blocked, so timeouts test instantly and leftover blocked goroutines fail the test."
    },
    {
     "q": "Where does go test store failing fuzz inputs?",
     "a": "testdata/fuzz/FuzzName/; they then run as regular regression cases in every go test."
    }
   ],
   "resources": [
    {
     "title": "justforfunc: Reflection",
     "url": "https://www.youtube.com/c/JustForFunc",
     "type": "video"
    },
    {
     "title": "Go Generics Tutorial",
     "url": "https://www.youtube.com/watch?v=Z8hA_bjRtQs",
     "type": "video"
    },
    {
     "title": "Go Blog — Range Over Function Types",
     "url": "https://go.dev/blog/range-functions",
     "type": "article"
    },
    {
     "title": "Go package iter",
     "url": "https://pkg.go.dev/iter",
     "type": "docs"
    },
    {
     "title": "Go Fuzzing",
     "url": "https://go.dev/doc/security/fuzz/",
     "type": "docs"
    },
    {
     "title": "Go package testing/synctest",
     "url": "https://pkg.go.dev/testing/synctest",
     "type": "docs"
    },
    {
     "title": "Go Blog — An Introduction To Generics",
     "url": "https://go.dev/blog/intro-generics",
     "type": "article"
    }
   ]
  },
  {
   "n": 5,
   "title": "Concurrency Fundamentals",
   "group": "Core Go (Weeks 1–8)",
   "topics": [
    {
     "title": "Goroutines: lightweight threads",
     "def": "Goroutines are Go's concurrency primitive — <strong>lightweight, user-space threads</strong> managed entirely by the Go runtime, not the OS. Launch with the <code>go</code> keyword: <code>go myFunc()</code>.<br><br><strong>Key characteristics:</strong><br>• Start with a <strong>small, growable stack</strong>: a minimum of 2 KB, and since Go 1.19 the runtime starts new goroutines at the average stack size it has observed. Stacks grow by copying, up to 1 GB on 64-bit. An OS thread instead gets a <strong>fixed stack reservation</strong> at creation, typically <strong>8 MB of virtual memory on Linux</strong> (<code>ulimit -s</code> / the glibc pthread default) and 1 MB by default on Windows. Only the pages it touches use RAM, but the reservation plus kernel scheduling costs limit you to thousands of threads, not millions<br>• Use <strong>M:N scheduling</strong>: M goroutines multiplexed onto N OS threads by Go's scheduler<br>• Context switching takes ~100ns (vs ~1-10μs for OS threads) — you can run <strong>millions</strong> of goroutines<br>• The scheduler uses <strong>work-stealing</strong>: idle threads steal goroutines from busy threads' run queues<br><br><strong>Go scheduler internals (GMP model):</strong> G = Goroutine, M = Machine (OS thread), P = Processor (logical processor, defaults to <code>GOMAXPROCS</code>). Each P has a local run queue. When a goroutine blocks on I/O, the M releases the P so another M can use it. This is why goroutines scale: blocking I/O doesn't waste threads. Network I/O does not even block an M: the goroutine parks on the netpoller (epoll/kqueue/IOCP). <strong>Preemption:</strong> since Go 1.14 the scheduler preempts long-running goroutines asynchronously (with a signal), so a tight loop can no longer starve other goroutines or the GC.<br><br><strong>Waiting for goroutines:</strong> <code>sync.WaitGroup</code>. Go 1.25 added <code>wg.Go(f)</code>, which does the <code>Add(1)</code>, starts the goroutine and calls <code>Done</code> for you, removing the classic Add-inside-the-goroutine bug.<br><br><strong>Goroutine leaks:</strong> A goroutine that blocks forever cannot be garbage collected — see the dedicated <em>Goroutine Leaks</em> topic in Week 6 for causes, detection, and prevention patterns.",
     "interview": "'Goroutine vs OS thread?' — Goroutine: ~2 KB growable stack, scheduled by the Go runtime (M:N), ~100-200 ns switch. OS thread: fixed stack reservation (typically 8 MB virtual on Linux, 1 MB on Windows), kernel-scheduled, ~1-5 µs switch. 'Are goroutines cooperative?' — Not since Go 1.14: asynchronous preemption interrupts long-running loops. 'How to prevent goroutine leaks?' — Give every goroutine an exit path (ctx.Done, closed channel); see the Week 6 Goroutine Leaks topic. 'GOMAXPROCS?' — Number of Ps, i.e. goroutines executing Go code simultaneously; defaults to the CPU count, capped by the cgroup CPU limit on Linux since 1.25. 'GMP model?' — G=goroutine, M=OS thread, P=processor with a local run queue; work stealing balances the queues. 'wg.Go?' — Go 1.25 helper: Add + go + Done.",
     "examples": [
      {
       "label": "Goroutine lifecycle patterns",
       "lang": "go",
       "code": "// Basic — fire and forget (AVOID in production: no way to wait or stop it)\ngo func() {\n    fmt.Println(\"background work\")\n}()\n\n// WaitGroup — wait for all goroutines to finish\nvar wg sync.WaitGroup\nfor _, item := range items {\n    wg.Add(1) // MUST be before go, not inside the goroutine!\n    go func() {\n        defer wg.Done()\n        process(item) // Go 1.22+: item is per-iteration, safe to capture\n    }()\n}\nwg.Wait() // blocks until every Done() has been called\n\n// Go 1.25+: WaitGroup.Go does Add/Done for you\nvar wg2 sync.WaitGroup\nfor _, item := range items {\n    wg2.Go(func() { process(item) })\n}\nwg2.Wait()\n\n// Error collection\nerrs := make(chan error, len(items)) // buffered: senders never block\nfor _, it := range items {\n    go func() { errs <- processErr(it) }()\n}\nfor range items {\n    if err := <-errs; err != nil {\n        log.Println(err)\n    }\n}"
      },
      {
       "label": "Avoiding common goroutine bugs",
       "lang": "go",
       "code": "// BUG: closure captures loop variable\nfor _, v := range values {\n    go func() {\n        fmt.Println(v)  // WRONG: v changes before goroutine runs\n    }()\n}\n\n// FIX 1: pass as parameter\nfor _, v := range values {\n    go func(val int) {\n        fmt.Println(val)  // correct — val is a copy\n    }(v)\n}\n\n// FIX 2: Go 1.22+ — loop variable is per-iteration\n// (in Go 1.22+, the bug above is fixed automatically)\n\n// Goroutine leak detection in tests (Go 1.25+): synctest.Test fails\n// with a deadlock if goroutines started inside are still blocked at the end\nfunc TestNoLeak(t *testing.T) {\n    synctest.Test(t, func(t *testing.T) {\n        doWork()\n    })\n}\n// Older alternative: goleak.VerifyNone(t) (go.uber.org/goleak)"
      }
     ]
    },
    {
     "title": "Channels: buffered/unbuffered",
     "def": "Channels are <strong>typed conduits</strong> for communication between goroutines — Go's primary mechanism for sharing data safely. The Go proverb: <em>'Don't communicate by sharing memory; share memory by communicating.'</em><br><br><strong>Unbuffered channels</strong> (<code>make(chan int)</code>): the sender blocks until a receiver is ready, and vice versa. This provides <strong>synchronization</strong> — you know that by the time the send completes, the receiver has the value. Think of it as a handoff.<br><br><strong>Buffered channels</strong> (<code>make(chan int, 5)</code>): the sender blocks only when the buffer is full; the receiver blocks only when the buffer is empty. Decouples timing between producer and consumer. The buffer size is the number of values that can be in-flight.<br><br><strong>Critical rules:</strong><br>• Only the <strong>sender</strong> should close a channel (never the receiver) — sending to a closed channel panics<br>• <code>range</code> over a channel reads values until the channel is closed<br>• Receiving from a closed channel returns the zero value immediately (use <code>val, ok := &lt;-ch</code> to detect closure)<br>• <strong>Directional channel types</strong> enforce at compile time who sends and who receives: <code>chan&lt;- int</code> (send-only), <code>&lt;-chan int</code> (receive-only)<br>• A nil channel blocks forever on both send and receive — useful in select to disable a case",
     "interview": "'Buffered vs unbuffered?' — Unbuffered: synchronizes sender/receiver. Buffered: decouples timing, blocks when full/empty. 'Who closes?' — Only the sender. Sending to closed channel panics. 'Nil channel?' — Blocks forever. Useful in select to disable a case. 'Directional channels?' — chan<- (send-only), <-chan (receive-only). Enforced at compile time.",
     "examples": [
      {
       "label": "Channel fundamentals",
       "lang": "go",
       "code": "// Unbuffered — synchronous handoff\nch := make(chan int)\ngo func() {\n    ch <- 42    // blocks until main receives\n}()\nval := <-ch     // blocks until goroutine sends\nfmt.Println(val) // 42\n\n// Buffered — async up to buffer size\nch := make(chan int, 3)\nch <- 1  // doesn't block (buffer has room)\nch <- 2  // doesn't block\nch <- 3  // doesn't block\n// ch <- 4  // WOULD block — buffer full\n\n// Range + close\nch := make(chan string, 5)\ngo func() {\n    for _, s := range []string{\"a\",\"b\",\"c\"} { ch <- s }\n    close(ch)  // signal: no more values\n}()\nfor val := range ch {  // reads until close\n    fmt.Println(val)\n}"
      },
      {
       "label": "Directional channels and patterns",
       "lang": "go",
       "code": "// Directional types enforce usage at compile time\nfunc producer(out chan<- int) {  // can only SEND\n    for i := 0; i < 5; i++ { out <- i }\n    close(out)\n}\n\nfunc consumer(in <-chan int) {   // can only RECEIVE\n    for v := range in {\n        fmt.Printf(\"got: %d\\n\", v)\n    }\n}\n\nch := make(chan int, 5)\ngo producer(ch)\nconsumer(ch)\n\n// Detect channel close\nval, ok := <-ch\nif !ok {\n    fmt.Println(\"channel closed\")\n}\n\n// Done channel pattern (signaling)\ndone := make(chan struct{})\ngo func() {\n    defer close(done)\n    doWork()\n}()\n<-done  // wait for completion"
      }
     ]
    },
    {
     "title": "Select: non-blocking, timeouts",
     "def": "The <code>select</code> statement is Go's <strong>multiplexer for channel operations</strong> — it lets a goroutine wait on multiple channel sends/receives simultaneously. It is syntactically similar to <code>switch</code> but operates on channels instead of values.<br><br><strong>How it works:</strong> <code>select</code> blocks until <em>one</em> of its cases is ready (a channel can send or receive). If <strong>multiple cases are ready simultaneously</strong>, Go picks one at <strong>random</strong> — this is fair scheduling that prevents starvation of any particular case.<br><br><strong>The default case:</strong> Adding <code>default</code> makes select <strong>non-blocking</strong>. If no channel is ready, the default executes immediately. This is essential for: try-send patterns (send if receiver is ready, skip otherwise), polling without blocking, and implementing non-blocking channel drains.<br><br><strong>Common patterns:</strong><br>• <strong>Timeout</strong>: <code>case &lt;-time.After(5*time.Second):</code> — triggers if no other case fires within the duration. Each call to <code>time.After</code> allocates a new timer. <strong>Before Go 1.23</strong> an unfired timer was not garbage collected until it fired, so <code>time.After(time.Minute)</code> inside a busy loop accumulated memory. <strong>Since Go 1.23</strong>, unreferenced timers and tickers are collected even if they are never stopped or fired, and timer channels are unbuffered, so after <code>Reset</code> or <code>Stop</code> no stale value can be received. This applies when go.mod says <code>go 1.23</code> or later; <code>GODEBUG=asynctimerchan=1</code> restores the old behavior. It still allocates on every iteration, so in hot loops reuse one <code>time.NewTimer</code> with <code>Reset</code>, or use a context deadline for an overall timeout.<br>• <strong>Context cancellation</strong>: <code>case &lt;-ctx.Done():</code> — the standard pattern for responding to cancellation in long-running operations.<br>• <strong>Graceful shutdown</strong>: every production Go server uses <code>select</code> to listen for OS signals (<code>SIGINT</code>, <code>SIGTERM</code>) alongside serving requests.<br>• <strong>Multiplexing</strong>: reading from multiple channels, processing whichever is ready first.<br>• <strong>nil channel trick</strong>: assigning a channel to <code>nil</code> in a select disables that case — the nil channel blocks forever, effectively removing it from selection.<br><br><strong>Empty select (<code>select {}</code>):</strong> blocks forever. Used in main when goroutines handle all work.",
     "interview": "'How does select choose?' — Random among ready cases (fair scheduling). 'Non-blocking receive?' — Use default case. 'Timeout pattern?' — time.After in select case. In hot loops prefer one reused time.NewTimer + Reset: time.After allocates per call, and before Go 1.23 unfired timers were retained until they fired (since 1.23 they are garbage collected). 'nil channel in select?' — Disables that case (blocks forever). 'Empty select?' — select{} blocks forever. 'Graceful shutdown?' — select on signal channel + ctx.Done().",
     "examples": [
      {
       "label": "Select patterns",
       "lang": "go",
       "code": "// Timeout\nselect {\ncase msg := <-ch: handle(msg)\ncase <-time.After(5 * time.Second):\n    return errors.New(\"timeout\")\n}\n\n// Context cancellation\nselect {\ncase result := <-work:\n    return result, nil\ncase <-ctx.Done():\n    return nil, ctx.Err()\n}\n\n// Non-blocking check\nselect {\ncase msg := <-ch:\n    process(msg)\ndefault:\n    // ch not ready, do other work\n}"
      },
      {
       "label": "Fan-in with select",
       "lang": "go",
       "code": "func fanIn(ch1, ch2 <-chan string) <-chan string {\n    out := make(chan string)\n    go func() {\n        defer close(out)\n        for ch1 != nil || ch2 != nil {\n            select {\n            case v, ok := <-ch1:\n                if !ok { ch1 = nil; continue }\n                out <- v\n            case v, ok := <-ch2:\n                if !ok { ch2 = nil; continue }\n                out <- v\n            }\n        }\n    }()\n    return out\n}"
      },
      {
       "label": "Idle timeout in a loop: reuse one timer",
       "lang": "go",
       "code": "func consume(ctx context.Context, in <-chan Msg) error {\n    const idleAfter = 30 * time.Second\n    idle := time.NewTimer(idleAfter)\n    defer idle.Stop()\n    for {\n        select {\n        case m, ok := <-in:\n            if !ok {\n                return nil // producer closed the channel\n            }\n            handle(m)\n            idle.Reset(idleAfter) // Go 1.23+: no need to drain idle.C first\n        case <-idle.C:\n            return errors.New(\"idle timeout\")\n        case <-ctx.Done():\n            return ctx.Err()\n        }\n    }\n}"
      }
     ]
    },
    {
     "title": "Sync: Mutex, WaitGroup, Once",
     "def": "The <code>sync</code> package provides low-level synchronization primitives for coordinating goroutines. While channels are preferred for communication, sync primitives are essential for protecting shared state.<br><br><strong>sync.Mutex:</strong> Provides <strong>mutual exclusion</strong> — only one goroutine can hold the lock at a time. Lock() acquires, Unlock() releases. Always use <code>defer mu.Unlock()</code> to prevent deadlocks from early returns or panics. Zero value is an unlocked mutex (no initialization needed).<br><br><strong>sync.RWMutex:</strong> Allows <strong>multiple concurrent readers OR one exclusive writer</strong>. <code>RLock()/RUnlock()</code> for reads, <code>Lock()/Unlock()</code> for writes. Use it only when reads significantly outnumber writes <em>and</em> the read-side critical sections do real work. There is no fixed speed-up. Every <code>RLock</code>/<code>RUnlock</code> is an atomic update of a shared reader count, so with many cores that cache line bounces between CPUs, and for tiny critical sections (read one field, look up a small map) an RWMutex is often <strong>slower</strong> than a plain Mutex. A waiting writer also blocks new readers (writer preference), so a recursive <code>RLock</code> can deadlock. Benchmark both (<code>go test -bench . -cpu 1,8,32</code>). For read-mostly configuration, an <code>atomic.Pointer</code> swapped on update is usually better than either.<br><br><strong>sync.WaitGroup:</strong> Waits for a collection of goroutines to finish. Three methods: <code>Add(n)</code> increments counter, <code>Done()</code> decrements (equivalent to Add(-1)), <code>Wait()</code> blocks until counter is zero. <strong>Critical pitfall:</strong> Call <code>Add()</code> BEFORE launching the goroutine, not inside it — otherwise there's a race between Wait() and Add(). Go 1.25 added <code>wg.Go(func() {...})</code>, which does the <code>Add(1)</code>/<code>Done()</code> pair for you.<br><br><strong>sync.Once:</strong> Guarantees a function executes <strong>exactly once</strong>, even across multiple goroutines. The classic use case is the <strong>singleton pattern</strong>: lazy initialization of a database connection, config loader, or expensive resource. Thread-safe by design. <code>sync.OnceFunc</code>, <code>OnceValue</code> and <code>OnceValues</code> (Go 1.21) wrap a function so it runs once and its result is cached. If it panics, every call re-panics with the same value.<br><br><strong>sync.Map:</strong> A concurrent map optimized for two specific patterns: (1) keys written once but read many times, (2) goroutines access disjoint key sets. For all other cases, a regular map with RWMutex is faster and simpler. Do not use sync.Map as a default — it's a specialized tool. Since Go 1.24 it is built on a concurrent hash-trie, which made updates and disjoint-key workloads considerably faster, but its API is still untyped (<code>any</code>).<br><br><strong>sync.Pool:</strong> A pool of reusable temporary objects to <strong>reduce GC pressure</strong>. Pooled objects may be dropped at any GC (a victim cache keeps them for one extra cycle), so it is <em>not</em> a cache. Reset objects before <code>Put</code>, and do not pool very large buffers, which would pin memory. Common use: pooling <code>bytes.Buffer</code>, JSON encoders, or other allocate-heavy objects in hot paths. Used extensively in the standard library (<code>fmt</code>, <code>encoding/json</code>).",
     "interview": "'Mutex vs RWMutex?' — RWMutex lets readers share, but every RLock/RUnlock is an atomic on a shared counter; it only wins for read-heavy work with non-trivial critical sections and can be slower than Mutex on many cores. Benchmark it, and consider atomic.Pointer for read-mostly config. 'WaitGroup pitfall?' — Add() BEFORE the go statement, or use wg.Go (Go 1.25). 'sync.Once?' — Thread-safe lazy init, executes exactly once; OnceValue/OnceFunc (1.21) return cached results. 'sync.Map vs map+mutex?' — sync.Map for write-once-read-many or disjoint keys; a map plus mutex otherwise. 'sync.Pool?' — Reduces GC pressure; objects can be dropped at any GC (it is not a cache).",
     "examples": [
      {
       "label": "Sync primitives",
       "lang": "go",
       "code": "// Mutex\ntype SafeMap struct {\n    mu sync.RWMutex\n    m  map[string]int\n}\nfunc (s *SafeMap) Get(k string) int {\n    s.mu.RLock(); defer s.mu.RUnlock()\n    return s.m[k]\n}\nfunc (s *SafeMap) Set(k string, v int) {\n    s.mu.Lock(); defer s.mu.Unlock()\n    s.m[k] = v\n}\n\n// Once — singleton\nvar instance *DB\nvar once sync.Once\nfunc GetDB() *DB {\n    once.Do(func() { instance = connectDB() })\n    return instance\n}"
      },
      {
       "label": "WaitGroup + Pool",
       "lang": "go",
       "code": "// WaitGroup (Go 1.25+: wg.Go replaces Add/Done)\nvar wg sync.WaitGroup\nfor _, url := range urls {\n    wg.Go(func() {\n        fetch(url) // url is per-iteration since Go 1.22\n    })\n}\nwg.Wait()\n\n// OnceValue (Go 1.21+): lazy, cached, concurrency-safe\nvar loadConfig = sync.OnceValue(func() *Config {\n    return mustLoad(\"config.yaml\")\n})\ncfg := loadConfig() // first call loads, later calls return the cached value\n\n// Pool — reduce allocations in hot paths\nvar bufPool = sync.Pool{\n    New: func() any { return new(bytes.Buffer) },\n}\nbuf := bufPool.Get().(*bytes.Buffer)\nbuf.Reset()\ndefer bufPool.Put(buf)"
      }
     ]
    },
    {
     "title": "Patterns: worker pool, fan-in/out",
     "def": "Go's concurrency primitives (goroutines, channels, select) compose into powerful design patterns used in every production Go system:<br><br><strong>Worker Pool:</strong> A fixed number of goroutines read from a shared job channel. Benefits: bounded concurrency (prevents resource exhaustion), reuse of goroutines (avoids spawn/destroy overhead), backpressure via channel buffering. The pattern: create N workers reading from <code>jobs chan</code>, send work, close the channel, collect results. This is the most common concurrency pattern in Go.<br><br><strong>Fan-out / Fan-in:</strong> <em>Fan-out</em> distributes work from one channel to multiple goroutines running the same stage in parallel. <em>Fan-in</em> merges results from multiple channels into a single output channel. Together, they parallelize CPU-bound or I/O-bound stages of a pipeline.<br><br><strong>Pipeline:</strong> A chain of stages connected by channels, where each stage is a goroutine (or group of goroutines) that reads from an input channel, processes data, and writes to an output channel. Each stage function returns <code>&lt;-chan T</code> (receive-only). Pipelines enable streaming processing with bounded memory — you can process billions of records without loading everything into memory.<br><br><strong>Rate limiter:</strong> Controls throughput using tickers (<code>time.NewTicker</code>) or semaphores (buffered channel of <code>struct{}{}</code>). Common in API clients to respect rate limits, and in servers to prevent overload.<br><br><strong>Done channel / Context cancellation:</strong> Every long-running goroutine should accept a <code>context.Context</code> or <code>done</code> channel to support graceful shutdown. Without this, goroutines become leaks.<br><br><strong>Pub/Sub:</strong> One publisher sends to multiple subscriber channels. Used for event-driven architectures within a Go service.",
     "interview": "'Worker pool design?' — Fixed goroutines + job channel + results channel. Bounded concurrency. 'Pipeline vs fan-out?' — Pipeline: sequential stages. Fan-out: parallel same-stage. Fan-in: merge results. 'Rate limiter pattern?' — Buffered channel as semaphore or time.Ticker for throughput control. 'Error handling in pipelines?' — errgroup (cancels on first error) or dedicated error channel. 'When to use worker pool?' — Bounded concurrency, prevent resource exhaustion, reuse goroutines.",
     "examples": [
      {
       "label": "Worker pool",
       "lang": "go",
       "code": "func workerPool(numWorkers int, jobs []Job) []Result {\n    jobCh := make(chan Job, len(jobs))\n    resCh := make(chan Result, len(jobs))\n    var wg sync.WaitGroup\n    for w := 0; w < numWorkers; w++ {\n        wg.Add(1)\n        go func() {\n            defer wg.Done()\n            for j := range jobCh {\n                resCh <- process(j)\n            }\n        }()\n    }\n    for _, j := range jobs { jobCh <- j }\n    close(jobCh)\n    go func() { wg.Wait(); close(resCh) }()\n    var results []Result\n    for r := range resCh { results = append(results, r) }\n    return results\n}"
      },
      {
       "label": "Pipeline",
       "lang": "go",
       "code": "func generate(nums ...int) <-chan int {\n    out := make(chan int)\n    go func() {\n        for _, n := range nums { out <- n }\n        close(out)\n    }()\n    return out\n}\nfunc square(in <-chan int) <-chan int {\n    out := make(chan int)\n    go func() {\n        for n := range in { out <- n * n }\n        close(out)\n    }()\n    return out\n}\n// Usage: for v := range square(generate(1,2,3)) { ... }"
      }
     ]
    },
    {
     "title": "Deadlocks: detection, prevention",
     "def": "A <strong>deadlock</strong> occurs when two or more goroutines are permanently blocked, each waiting for the other to release a resource. Go's runtime can detect <em>global</em> deadlocks (all goroutines blocked) and panics with <code>fatal error: all goroutines are asleep - deadlock!</code>. However, <strong>partial deadlocks</strong> (subset of goroutines blocked while others run) are NOT detected by the runtime — they silently leak resources.<br><br><strong>4 Conditions for Deadlock (Coffman Conditions):</strong><br>1. <strong>Mutual Exclusion</strong> — resource held exclusively by one goroutine<br>2. <strong>Hold and Wait</strong> — goroutine holds one resource while waiting for another<br>3. <strong>No Preemption</strong> — resources cannot be forcibly taken away<br>4. <strong>Circular Wait</strong> — a cycle exists in the resource dependency graph<br><br><strong>Common deadlock patterns in Go:</strong><br>• <strong>Channel deadlock:</strong> Sending to unbuffered channel with no receiver, or receiving from a channel with no sender<br>• <strong>Mutex deadlock:</strong> Lock ordering violation — goroutine A locks mutex1 then mutex2, goroutine B locks mutex2 then mutex1<br>• <strong>Self-deadlock:</strong> A goroutine tries to Lock() a sync.Mutex it already holds (Go mutexes are NOT reentrant)<br>• <strong>WaitGroup misuse:</strong> a missing <code>Done()</code> (e.g. an early return without <code>defer</code>) or an <code>Add(n)</code> larger than the number of goroutines makes <code>Wait()</code> block forever. Calling <code>Add()</code> inside the goroutine is a race (Wait may return too early). <code>wg.Go</code> (Go 1.25) avoids both.<br>• <strong>RWMutex recursion:</strong> taking <code>RLock</code> twice in one goroutine deadlocks if a writer queues between the two calls<br><br><strong>Prevention strategies:</strong><br>• <strong>Lock ordering:</strong> Always acquire mutexes in a consistent, globally-defined order<br>• <strong>Timeouts:</strong> Use <code>select</code> with <code>time.After</code> or <code>context.WithTimeout</code> to avoid indefinite blocking<br>• <strong>Try-lock pattern:</strong> Use a select with default clause on a buffered channel of size 1 as a non-blocking lock<br>• <strong>Channel direction:</strong> Use directional channels (<code>chan&lt;-</code>, <code>&lt;-chan</code>) to make data flow explicit and prevent circular dependencies<br>• <strong>Single owner:</strong> Design so each resource has exactly one goroutine that owns it<br><br><strong>Detection in practice:</strong> the runtime only reports a <em>global</em> deadlock (\"all goroutines are asleep\"), and only if nothing could ever wake them. A server with a listener or a timer never qualifies. For <strong>partial deadlocks</strong>, use the goroutine profile (<code>/debug/pprof/goroutine?debug=2</code> shows each wait reason and duration, e.g. <code>[sync.Mutex.Lock, 12 minutes]</code>), a SIGQUIT stack dump, or the <strong>goroutine leak profile</strong>. That profile is experimental in Go 1.26 and on by default in 1.27; it uses the GC to find goroutines blocked on channels or locks that no running goroutine can reach. In tests, <code>testing/synctest</code> fails with a deadlock instead of hanging. <code>sync.Mutex.TryLock</code> exists (Go 1.18), but needing it is usually a design smell.",
     "interview": "'What is a deadlock?' — All goroutines permanently blocked waiting for each other. Go runtime detects global deadlocks but NOT partial ones. 'How to prevent deadlocks?' — Consistent lock ordering, timeouts with select, avoid nested locks, use directional channels. 'Are Go mutexes reentrant?' — No. Locking a mutex you already hold causes a deadlock. 'WaitGroup deadlock?' — Add() must be called before launching the goroutine, not inside it. 'Partial deadlock?' — Subset of goroutines blocked while others run. Runtime won't detect it — use pprof goroutine profile. 'How do you find a partial deadlock in production?' — Goroutine profile with debug=2 (wait reason plus minutes blocked), SIGQUIT dump, or the goroutineleak profile (experimental in 1.26, default in 1.27).",
     "examples": [
      {
       "label": "Channel deadlock examples",
       "lang": "go",
       "code": "// DEADLOCK 1: unbuffered channel, no receiver\nch := make(chan int)\nch <- 42 // blocks forever, no goroutine to receive\n\n// DEADLOCK 2: sending and receiving on same goroutine\nch := make(chan int)\nch <- 1    // blocks, waiting for receiver\nfmt.Println(<-ch) // never reached\n\n// FIX: use a goroutine for one side\nch := make(chan int)\ngo func() { ch <- 42 }()\nfmt.Println(<-ch) // works!"
      },
      {
       "label": "Mutex deadlock and prevention",
       "lang": "go",
       "code": "// DEADLOCK: inconsistent lock ordering\nvar mu1, mu2 sync.Mutex\n\n// Goroutine A: locks mu1 → mu2\ngo func() {\n    mu1.Lock(); defer mu1.Unlock()\n    time.Sleep(time.Millisecond)\n    mu2.Lock(); defer mu2.Unlock() // waits for B\n}()\n\n// Goroutine B: locks mu2 → mu1\ngo func() {\n    mu2.Lock(); defer mu2.Unlock()\n    time.Sleep(time.Millisecond)\n    mu1.Lock(); defer mu1.Unlock() // waits for A\n}()\n// CIRCULAR WAIT → DEADLOCK\n\n// FIX: always lock in same order (mu1 before mu2)\ngo func() {\n    mu1.Lock(); defer mu1.Unlock()\n    mu2.Lock(); defer mu2.Unlock()\n}()\ngo func() {\n    mu1.Lock(); defer mu1.Unlock() // same order!\n    mu2.Lock(); defer mu2.Unlock()\n}()"
      },
      {
       "label": "Timeout-based deadlock prevention",
       "lang": "go",
       "code": "// Use select + timeout to avoid indefinite blocking\nfunc safeSend(ch chan<- int, val int, timeout time.Duration) bool {\n    select {\n    case ch <- val:\n        return true // sent successfully\n    case <-time.After(timeout):\n        return false // timed out, no deadlock\n    }\n}\n\n// Try-lock pattern using buffered channel\ntype TryMutex struct {\n    ch chan struct{}\n}\nfunc NewTryMutex() *TryMutex { m := &TryMutex{ch: make(chan struct{}, 1)}; m.ch <- struct{}{}; return m }\nfunc (m *TryMutex) Lock()    { <-m.ch }\nfunc (m *TryMutex) Unlock()  { m.ch <- struct{}{} }\nfunc (m *TryMutex) TryLock() bool {\n    select {\n    case <-m.ch: return true\n    default:     return false // already locked\n    }\n}"
      }
     ]
    },
    {
     "title": "Race Conditions & Data Races",
     "def": "A <strong>race condition</strong> is a broader concept: the program's correctness depends on the <em>timing or order</em> of goroutine execution. A <strong>data race</strong> is a specific, dangerous type: two goroutines access the same memory concurrently, and at least one is a write, with <strong>no synchronization</strong>.<br><br><strong>Data races in Go can do far more than return stale values</strong>: the program can produce wrong results, crash, or corrupt memory. Races on multi-word values (interfaces, strings, slices) can <em>tear</em>, so a reader sees a pointer from one write and a length or type from another, which breaks memory safety. Unlike C/C++, Go provides the <code>-race</code> detector to find them.<br><br><strong>Go Race Detector:</strong> <code>go run -race</code>, <code>go test -race</code>, <code>go build -race</code>. It instruments memory accesses at runtime and reports unsynchronized concurrent access. Typical overhead is 5–10x memory and 2–20x execution time, so use it in tests, CI and canary or staging builds, not in normal production. It is built on ThreadSanitizer: it tracks happens-before with vector clocks and shadow memory, so it has <strong>no false positives</strong> but only catches races that <strong>actually execute</strong> during the run (false negatives). Exercise real concurrency in tests (parallel subtests, <code>-count</code>, load tests under <code>-race</code>). <strong>Every Go project should run tests with -race in CI.</strong><br><br><strong>Common data race patterns:</strong><br>• <strong>Shared counter without sync:</strong> Multiple goroutines doing <code>count++</code> — this is read-modify-write, not atomic<br>• <strong>Map concurrent write:</strong> Two goroutines writing to the same map: the runtime detects this on a best-effort basis and aborts with <code>fatal error: concurrent map writes</code>, which cannot be recovered<br>• <strong>Slice append from goroutines:</strong> <code>append</code> is not thread-safe — may lose elements or corrupt the slice header<br>• <strong>Loop variable capture:</strong> Goroutines inside a for loop capturing the loop variable by reference — all goroutines see the final value (fixed in Go 1.22 with loop variable scoping)<br>• <strong>Check-then-act:</strong> <code>if !exists { create() }</code> without locking — another goroutine may create between check and act<br><br><strong>Fixes:</strong><br>• <code>sync.Mutex</code> / <code>sync.RWMutex</code> — protect shared state<br>• <code>sync/atomic</code> — for single values (counters, flags)<br>• <strong>Channels</strong> — transfer ownership of data between goroutines<br>• <strong>Confinement</strong> — don't share at all; each goroutine owns its own data<br>• <code>sync.Map</code> — for specific concurrent map patterns",
     "interview": "'Data race vs race condition?' — Data race: concurrent unsynchronized memory access (at least one write). Race condition: correctness depends on execution order. A data race is always a bug; a race condition may or may not be. 'How to detect?' — go test -race in CI. 'Loop variable capture?' — Pre-Go 1.22: all goroutines see final value. Fix: shadow variable or pass as argument. Go 1.22+: each iteration gets its own variable. 'Map concurrent write?' — Best-effort detection that aborts the process with an unrecoverable fatal error. 'Can -race prove there are no races?' — No: it only reports races that occur during the run (no false positives, but false negatives). Use sync.RWMutex or sync.Map.",
     "examples": [
      {
       "label": "Data race examples and fixes",
       "lang": "go",
       "code": "// DATA RACE: shared counter\nvar count int\nvar wg sync.WaitGroup\nfor i := 0; i < 1000; i++ {\n    wg.Add(1)\n    go func() {\n        defer wg.Done()\n        count++ // DATA RACE: read-modify-write\n    }()\n}\nwg.Wait()\n// count may be < 1000!\n\n// FIX 1: Mutex\nvar mu sync.Mutex\nfor i := 0; i < 1000; i++ {\n    wg.Add(1)\n    go func() {\n        defer wg.Done()\n        mu.Lock()\n        count++\n        mu.Unlock()\n    }()\n}\n\n// FIX 2: Atomic\nvar atomicCount atomic.Int64\nfor i := 0; i < 1000; i++ {\n    wg.Add(1)\n    go func() {\n        defer wg.Done()\n        atomicCount.Add(1)\n    }()\n}\n\n// FIX 3: Channel (collect results)\nresults := make(chan int, 1000)\nfor i := 0; i < 1000; i++ {\n    go func() { results <- 1 }()\n}\nfor i := 0; i < 1000; i++ {\n    count += <-results\n}"
      },
      {
       "label": "Loop variable capture race",
       "lang": "go",
       "code": "// BUG (pre-Go 1.22): all goroutines print final value\nfor i := 0; i < 5; i++ {\n    go func() {\n        fmt.Println(i) // captures variable, not value\n        // prints: 5 5 5 5 5 (or similar)\n    }()\n}\n\n// FIX 1: pass as argument (all Go versions)\nfor i := 0; i < 5; i++ {\n    go func(n int) {\n        fmt.Println(n) // each goroutine has own copy\n    }(i)\n}\n\n// FIX 2: shadow variable (all Go versions)\nfor i := 0; i < 5; i++ {\n    i := i // shadow: new variable per iteration\n    go func() {\n        fmt.Println(i)\n    }()\n}\n\n// Go 1.22+: fixed automatically — each loop\n// iteration has its own i variable"
      },
      {
       "label": "Check-then-act race",
       "lang": "go",
       "code": "// RACE: check-then-act without lock\nvar cache = make(map[string]string)\nvar mu sync.RWMutex\n\n// WRONG: race between RLock check and Lock write\nfunc getOrSet(key, val string) string {\n    mu.RLock()\n    if v, ok := cache[key]; ok {\n        mu.RUnlock()\n        return v\n    }\n    mu.RUnlock()\n    // Another goroutine may set key here!\n    mu.Lock()\n    defer mu.Unlock()\n    // MUST double-check after acquiring write lock\n    if v, ok := cache[key]; ok {\n        return v // another goroutine set it\n    }\n    cache[key] = val\n    return val\n}\n\n// This is the \"double-checked locking\" pattern\n// Alternatively, use sync.Map or sync.Once for init"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Worker pool",
     "type": "coding",
     "solution": "jobs := make(chan int, 100)\nfor w:=0; w<3; w++ { go func(){ for j := range jobs { fmt.Println(j) } }() }\nfor j:=0;j<10;j++ { jobs<-j }; close(jobs)",
     "lang": "go",
     "url": "https://leetcode.com/problems/task-scheduler/",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    },
    {
     "t": "Rate limiter",
     "type": "coding",
     "url": "https://leetcode.com/problems/logger-rate-limiter/"
    },
    {
     "t": "Fan-in/fan-out pipeline",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    },
    {
     "t": "Select timeout",
     "type": "coding",
     "solution": "select {\ncase r := <-ch: fmt.Println(r)\ncase <-time.After(time.Second): fmt.Println(\"timeout\")\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Producer-consumer",
     "type": "coding",
     "solution": "ch := make(chan int, 10)\ngo func() { for i:=0;i<5;i++ { ch<-i }; close(ch) }()\nfor v := range ch { fmt.Println(v) }",
     "lang": "go",
     "url": "https://leetcode.com/problems/design-bounded-blocking-queue/",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    },
    {
     "t": "Atomic counter",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Fan-in merge",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    },
    {
     "t": "Circuit breaker",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-bounded-blocking-queue/",
     "ex": "https://exercism.org/tracks/go/exercises/error-handling"
    },
    {
     "t": "Deadlock detector",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Semaphore",
     "type": "coding",
     "solution": "type Sem struct { ch chan struct{} }\nfunc New(n int) *Sem { return &Sem{make(chan struct{},n)} }\nfunc (s *Sem) Acquire() { s.ch <- struct{}{} }\nfunc (s *Sem) Release() { <-s.ch }",
     "lang": "go",
     "url": "https://leetcode.com/problems/design-bounded-blocking-queue/"
    },
    {
     "t": "WaitGroup",
     "type": "coding",
     "id": "w5_acode_0",
     "solution": "var wg sync.WaitGroup\nwg.Add(1)\ngo func() { defer wg.Done(); fmt.Println(\"done\") }()\nwg.Wait()",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    }
   ],
   "interviewFocus": [
    {
     "q": "Goroutine vs OS thread — explain the key differences.",
     "a": "A goroutine starts with a <strong>small growable stack</strong> (minimum 2 KB, grown by copying up to 1 GB), while an OS thread gets a <strong>fixed stack reservation</strong> when it is created: typically <strong>8 MB of virtual memory on Linux</strong> (<code>ulimit -s</code>) and 1 MB on Windows. Goroutines use <strong>M:N scheduling</strong>: many goroutines are multiplexed onto a few OS threads by the Go runtime rather than the kernel, and a switch costs roughly 100–200 ns in user space versus about 1–5 µs for a kernel thread switch. You can run <strong>millions of goroutines</strong> on one machine. Blocking network I/O parks only the goroutine (on the netpoller), and a blocking syscall hands its P to another thread. The scheduler uses per-P run queues with <strong>work stealing</strong>. Since Go 1.14 goroutines are <strong>preemptible</strong> (asynchronous, signal-based preemption), so \"cooperatively scheduled\" is outdated. They yield at blocking operations and function calls, and can also be interrupted in tight loops."
    },
    {
     "q": "How do you determine the right channel buffer size?",
     "a": "<strong>Unbuffered (size 0)</strong>: use when you want synchronization — sender blocks until receiver is ready. Best for handoff patterns. <strong>Buffer size 1</strong>: decouples timing between producer and consumer. <strong>Known workload size</strong>: buffer to match batch size (e.g., <code>make(chan Job, len(jobs))</code>). <strong>Rate limiting</strong>: buffer = max concurrent operations (semaphore pattern). Rule of thumb: start unbuffered, add buffering only when benchmarking shows it improves throughput. Over-buffering wastes memory and hides backpressure problems."
    },
    {
     "q": "How do you detect and prevent deadlocks, data races, and goroutine leaks?",
     "a": "<strong>Deadlocks</strong>: Go runtime detects when all goroutines are blocked (fatal error). Prevention: avoid circular channel dependencies, always use select with timeout/default. <strong>Data races</strong>: use <code>go run -race</code> / <code>go test -race</code> — the race detector finds concurrent unsynchronized access. Fix: use mutex, channels, or atomic operations. <strong>Goroutine leaks</strong>: goroutines blocked forever on channels/I/O — see Week 6 <em>Goroutine Leaks</em> topic for full detection and prevention patterns."
    },
    {
     "q": "When should you use channels vs mutexes for synchronization?",
     "a": "<strong>Channels</strong>: use when you need to <em>transfer ownership of data</em> between goroutines, coordinate goroutine lifecycle, or implement pipelines. Go proverb: 'Don't communicate by sharing memory; share memory by communicating.' <strong>Mutexes</strong>: use when you need to <em>protect shared state</em> that multiple goroutines read/write — especially simple counters, caches, configuration. Mutex is often simpler and faster for protecting a single data structure. Use channels for orchestration, mutexes for data protection."
    }
   ],
   "quiz": [
    {
     "q": "Goroutine?",
     "a": "~2 KB growable stack, started with the go keyword, M:N scheduled and preemptible (Go 1.14+)."
    },
    {
     "q": "Buffered vs unbuffered?",
     "a": "Unbuffered: syncs. Buffered: capacity."
    },
    {
     "q": "Select?",
     "a": "Wait on multiple channels."
    },
    {
     "q": "Mutex?",
     "a": "Lock for shared state."
    },
    {
     "q": "WaitGroup?",
     "a": "Add, Done, Wait."
    },
    {
     "q": "Deadlock?",
     "a": "Cyclic waiting, all block."
    },
    {
     "q": "Race?",
     "a": "Output depends on timing."
    },
    {
     "q": "Detect races?",
     "a": "go run -race."
    },
    {
     "q": "Chan vs mutex?",
     "a": "Chan: communicate. Mutex: protect."
    },
    {
     "q": "How big is an OS thread stack compared with a goroutine stack?",
     "a": "A Linux thread typically reserves 8 MB of virtual memory (ulimit -s), 1 MB on Windows; a goroutine starts at ~2 KB and grows by copying."
    },
    {
     "q": "Does time.After in a loop still leak in Go 1.23+?",
     "a": "No: unreferenced timers are now garbage collected, but each call still allocates a timer, so reuse one timer with Reset in hot loops."
    },
    {
     "q": "Is RWMutex always faster than Mutex for reads?",
     "a": "No. Reader-count atomics contend on one cache line; it only wins for read-heavy, non-trivial critical sections. Benchmark."
    },
    {
     "q": "What does sync.WaitGroup.Go do (Go 1.25)?",
     "a": "wg.Go(f) calls Add(1), runs f in a new goroutine and calls Done when f returns."
    }
   ],
   "resources": [
    {
     "title": "Go Concurrency Explained",
     "url": "https://www.youtube.com/watch?v=Lvg7SSJL4Tw",
     "type": "video"
    },
    {
     "title": "Concurrency Patterns",
     "url": "https://www.youtube.com/watch?v=fCn7ZYqLsLg",
     "type": "video"
    },
    {
     "title": "Data Race Detector",
     "url": "https://go.dev/doc/articles/race_detector",
     "type": "docs"
    },
    {
     "title": "Go Blog — Go Concurrency Patterns: Pipelines and cancellation",
     "url": "https://go.dev/blog/pipelines",
     "type": "article"
    },
    {
     "title": "Go package sync",
     "url": "https://pkg.go.dev/sync",
     "type": "docs"
    }
   ]
  },
  {
   "n": 6,
   "title": "Advanced Concurrency & Context",
   "group": "Core Go (Weeks 1–8)",
   "topics": [
    {
     "title": "Context: cancellation, deadlines, values",
     "def": "The <code>context</code> package provides a standard way to carry <strong>deadlines</strong>, <strong>cancellation signals</strong>, and <strong>request-scoped values</strong> across API boundaries and between goroutines. Every production Go service uses context extensively.<br><br><strong>Context tree:</strong> Contexts form a <em>tree</em>. <code>context.Background()</code> is the root (never cancelled). Child contexts inherit cancellation from parents — cancelling a parent automatically cancels all descendants. This enables <strong>hierarchical cancellation</strong>: when an HTTP request is cancelled by the client, all downstream database queries, API calls, and goroutines are also cancelled.<br><br><strong>Constructors:</strong><br>• <code>context.WithCancel(parent)</code> — returns a derived context + cancel function. Call cancel() to signal completion.<br>• <code>context.WithTimeout(parent, duration)</code> — auto-cancels after duration expires.<br>• <code>context.WithDeadline(parent, time)</code> — auto-cancels at a specific absolute time.<br>• <code>context.WithValue(parent, key, value)</code> — attaches request-scoped data (trace ID, auth user).<br><br><strong>Convention:</strong> Context is always the <strong>first parameter</strong>, named <code>ctx</code>: <code>func DoWork(ctx context.Context, ...)</code>. Never store context in a struct — pass it through the call chain. Always call <code>defer cancel()</code> to release resources. Check <code>ctx.Done()</code> in long-running loops to respond to cancellation.<br><br><strong>Newer APIs:</strong> <code>context.WithCancelCause</code> / <code>context.Cause(ctx)</code> (Go 1.20) record <em>why</em> work was cancelled, because <code>ctx.Err()</code> only ever reports Canceled or DeadlineExceeded. <code>WithTimeoutCause</code> and <code>WithDeadlineCause</code> arrived in 1.21. <code>context.AfterFunc(ctx, f)</code> (1.21) runs <code>f</code> once ctx is done and returns a <code>stop</code> function to deregister it, which is useful for unblocking a <code>sync.Cond</code> or closing a connection on cancel. <code>context.WithoutCancel(ctx)</code> (1.21) keeps the values but drops cancellation, for work that must outlive the request such as audit writes or async cleanup. <code>t.Context()</code> (Go 1.24) gives each test a context that is cancelled just before its cleanup functions run.",
     "interview": "'Context vs done channel?' — Context: hierarchical cancellation, deadlines, request-scoped values. Channel: simple signaling. 'When to use Background vs TODO?' — Background: top-level main, init, tests. TODO: placeholder when you know you should use a parent context but don't have one yet. 'Must-do with context?' — Always first param, always defer cancel(), never store in struct. 'Why was my context cancelled?' — Use WithCancelCause/context.Cause (1.20), because ctx.Err() only says Canceled or DeadlineExceeded. 'Work that must outlive the request?' — context.WithoutCancel(ctx) keeps values and drops cancellation. 'Run code on cancel?' — context.AfterFunc (1.21).",
     "examples": [
      {
       "label": "Cancellation and timeout patterns",
       "lang": "go",
       "code": "// Timeout — auto-cancels after 5 seconds\nctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)\ndefer cancel()  // ALWAYS defer cancel!\n\nselect {\ncase result := <-doWork(ctx):\n    fmt.Println(result)\ncase <-ctx.Done():\n    fmt.Println(\"cancelled:\", ctx.Err())  // context.DeadlineExceeded\n}\n\n// Manual cancellation\nctx, cancel := context.WithCancel(context.Background())\ngo func() {\n    time.Sleep(2 * time.Second)\n    cancel()  // signal all listeners\n}()\n<-ctx.Done()  // blocks until cancel() called"
      },
      {
       "label": "Long-running loop with context",
       "lang": "go",
       "code": "func processItems(ctx context.Context, items []Item) error {\n    for _, item := range items {\n        // Check cancellation between iterations\n        select {\n        case <-ctx.Done():\n            return ctx.Err()  // context.Canceled or DeadlineExceeded\n        default:\n        }\n        if err := process(item); err != nil {\n            return fmt.Errorf(\"process %s: %w\", item.ID, err)\n        }\n    }\n    return nil\n}"
      }
     ]
    },
    {
     "title": "Context propagation",
     "def": "Context propagation is the practice of <strong>passing context through every function in the call chain</strong> so that cancellation, deadlines, and request-scoped values flow from the entry point to the deepest downstream call. This is fundamental to building reliable, cancellation-aware Go services.<br><br><strong>Propagation chain in HTTP services:</strong> HTTP Handler (<code>r.Context()</code>) → Service layer → Repository layer → Database (<code>db.QueryContext(ctx, ...)</code>) / HTTP client (<code>http.NewRequestWithContext(ctx, ...)</code>) / gRPC calls. When a client disconnects, the context is cancelled, and all in-flight work at every layer is automatically stopped.<br><br><strong>Where context comes from:</strong><br>• <strong>HTTP servers:</strong> <code>r.Context()</code> — automatically cancelled when the client disconnects or server shuts down<br>• <strong>gRPC servers:</strong> context is passed as the first parameter to every RPC handler<br>• <strong>Main/tests:</strong> <code>context.Background()</code> as the root<br>• <strong>Derived contexts:</strong> <code>WithCancel</code>, <code>WithTimeout</code>, <code>WithDeadline</code> create children<br><br><strong>Anti-patterns to avoid:</strong><br>• <strong>Storing context in a struct</strong> — context is request-scoped and should flow, not persist<br>• <strong>Using context.Background() when a parent context exists</strong> — breaks cancellation chain<br>• <strong>Passing sensitive data (passwords, API keys) in context values</strong> — use proper parameter passing<br>• <strong>Ignoring context in long-running operations</strong> — always check <code>ctx.Done()</code> in loops",
     "interview": "'Context propagation flow?' — Handler → Service → Repository → DB/HTTP/gRPC. All use context-aware methods. 'Where does context come from?' — r.Context() in HTTP, parameter in gRPC, context.Background() in main/tests. 'Anti-patterns?' — Storing in struct, using Background when parent exists, ignoring ctx.Done() in loops, passing secrets as values.",
     "examples": [
      {
       "label": "Full propagation chain",
       "lang": "go",
       "code": "func handler(w http.ResponseWriter, r *http.Request) {\n    ctx := r.Context()\n    user, err := userService.GetUser(ctx, userID)\n    // ...\n}\n\nfunc (s *UserService) GetUser(ctx context.Context, id int) (*User, error) {\n    row := s.db.QueryRowContext(ctx, \"SELECT * FROM users WHERE id=$1\", id)\n    // ...\n}\n\n// HTTP client with context\nreq, _ := http.NewRequestWithContext(ctx, \"GET\", url, nil)\nresp, err := client.Do(req)"
      },
      {
       "label": "Middleware context enrichment",
       "lang": "go",
       "code": "func authMiddleware(next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        userID := extractUserID(r)\n        ctx := context.WithValue(r.Context(), userKey, userID)\n        next.ServeHTTP(w, r.WithContext(ctx))\n    })\n}"
      }
     ]
    },
    {
     "title": "Error handling: errgroup",
     "def": "<code>golang.org/x/sync/errgroup</code> is the <strong>standard solution for concurrent error handling</strong> in Go — it manages a group of goroutines, returns the <strong>first error</strong> encountered, and optionally cancels remaining work.<br><br><strong>Key features:</strong><br>• <code>errgroup.WithContext(ctx)</code> creates a derived context that is <strong>automatically cancelled when any goroutine returns an error</strong>. Other goroutines checking <code>ctx.Done()</code> will be notified to stop.<br>• <code>g.Go(func() error)</code> launches a goroutine that can return an error.<br>• <code>g.Wait()</code> blocks until all goroutines complete and returns the first non-nil error.<br>• <code>g.SetLimit(n)</code> (golang.org/x/sync, since 2022) bounds concurrency — at most N goroutines run simultaneously. This replaces manual semaphore patterns.<br>• <code>g.TryGo(func() error)</code> launches a goroutine only if the limit allows, returning false if at capacity.<br><br><strong>errgroup vs sync.WaitGroup:</strong> WaitGroup has no error handling — you must manually collect errors via channels. errgroup provides built-in error return + context cancellation. Use errgroup whenever goroutines can fail.<br><br><strong>Collecting ALL errors (not just first):</strong> errgroup returns only the first error. To collect all errors, write each result to its own slot (<code>errs[i]</code>) and combine them with <code>errors.Join(errs...)</code> after <code>Wait</code>, or use a mutex-protected slice. errgroup is not in the standard library; for fire-and-wait without errors, Go 1.25's <code>sync.WaitGroup.Go</code> is enough.",
     "interview": "'errgroup vs WaitGroup?' — errgroup: returns first error, cancels context on failure. WaitGroup: no error handling. 'SetLimit?' — Bounds concurrency and replaces manual semaphores (x/sync). 'How to collect all errors?' — errgroup returns first only. Use mutex-protected slice or error channel for all. 'When to use?' — Any time goroutines can fail: parallel API calls, batch processing, data pipelines.",
     "examples": [
      {
       "label": "errgroup with context",
       "lang": "go",
       "code": "g, ctx := errgroup.WithContext(context.Background())\n\ng.Go(func() error {\n    return fetchUser(ctx)  // cancelled if other goroutine fails\n})\ng.Go(func() error {\n    return fetchOrders(ctx)\n})\n\nif err := g.Wait(); err != nil {\n    log.Printf(\"first error: %v\", err)\n}"
      },
      {
       "label": "Bounded errgroup",
       "lang": "go",
       "code": "g, ctx := errgroup.WithContext(ctx)\ng.SetLimit(5) // max 5 concurrent goroutines\n\nfor _, url := range urls { // Go 1.22+: no url := url copy needed\n    g.Go(func() error {\n        return fetch(ctx, url)\n    })\n}\nreturn g.Wait()"
      }
     ]
    },
    {
     "title": "Atomic operations",
     "def": "The <code>sync/atomic</code> package provides <strong>lock-free operations</strong> on individual values, implemented using CPU-level atomic instructions (e.g., LOCK CMPXCHG on x86). For simple single-value operations they avoid the lock/unlock pair and can never park a goroutine.<br><br><strong>Legacy API:</strong> Functions like <code>atomic.AddInt64(&val, 1)</code>, <code>atomic.LoadInt64(&val)</code>, <code>atomic.StoreInt64(&val, 42)</code>. These operate on raw pointers and are error-prone (no type safety).<br><br><strong>Typed atomics (Go 1.19+):</strong> The modern API provides type-safe wrapper types:<br>• <code>atomic.Int32</code>, <code>atomic.Int64</code>, <code>atomic.Uint32</code>, <code>atomic.Uint64</code> — <code>Add()</code>, <code>Load()</code>, <code>Store()</code>, <code>CompareAndSwap()</code><br>• <code>atomic.Bool</code> — thread-safe boolean flags<br>• <code>atomic.Pointer[T]</code> — atomically swap pointers (e.g., hot-reload config without locks)<br>• Go 1.23 added <code>And</code>/<code>Or</code> methods on the integer types for bit flags<br><br><strong>Compare-And-Swap (CAS):</strong> The foundation of lock-free algorithms. <code>CompareAndSwap(old, new)</code> atomically checks if the value equals <code>old</code>; if so, replaces it with <code>new</code> and returns true. Otherwise returns false. Used in retry loops for lock-free updates.<br><br><strong>Performance:</strong> An <em>uncontended</em> atomic add is a single locked instruction (a few nanoseconds), so it is usually cheaper than an uncontended Mutex lock/unlock pair, and it never parks a goroutine. Under <em>contention</em> the picture changes. Every core still has to own the same cache line in turn, so a hot shared counter bounces between CPUs and scales poorly whether you use an atomic or a mutex. CAS retry loops can also spin under heavy contention, while a mutex parks the waiters. So there is no universal \"Nx faster\": shard hot counters (per-CPU or per-goroutine, summed on read) and <strong>measure</strong> with benchmarks at realistic <code>-cpu</code> values. Use atomics for: counters, flags, status indicators. Use mutex when you need to protect multiple related values atomically.<br><br><strong>Memory ordering:</strong> Go's atomics provide sequential consistency — simpler than C++ memory ordering models. All atomic operations are fully ordered across goroutines.",
     "interview": "'Atomic vs mutex?' — Atomic: single value, lock-free, cheaper when uncontended; contended atomics still bounce the cache line, so measure. Mutex: multiple values, more flexible. 'CAS?' — Compare-And-Swap: check current value, replace if matches. Foundation of lock-free algorithms. 'Typed atomics?' — Go 1.19+: atomic.Int64, atomic.Bool, atomic.Pointer[T]. Type-safe. 'When to use?' — Counters, flags, hot-reload config pointers. Not for protecting multiple related values.",
     "examples": [
      {
       "label": "Typed atomics (Go 1.19+)",
       "lang": "go",
       "code": "var counter atomic.Int64\ncounter.Add(1)\ncounter.Add(5)\nfmt.Println(counter.Load()) // 6\n\nvar flag atomic.Bool\nflag.Store(true)\nif flag.Load() { fmt.Println(\"active\") }\n\n// Pointer atomic\nvar config atomic.Pointer[Config]\nconfig.Store(&Config{Debug: true})\ncfg := config.Load()"
      },
      {
       "label": "Compare-And-Swap",
       "lang": "go",
       "code": "var state atomic.Int32\n// Only update if current value matches expected\nfor {\n    old := state.Load()\n    if state.CompareAndSwap(old, old+1) {\n        break // successfully incremented\n    }\n    // Another goroutine changed it, retry\n}"
      }
     ]
    },
    {
     "title": "Performance considerations",
     "def": "Writing correct concurrent code is necessary but not sufficient — you also need it to <strong>perform well</strong>. Key performance considerations:<br><br><strong>Goroutine count:</strong> Too many goroutines cause scheduling overhead and memory pressure (~2-8KB stack each). <em>CPU-bound</em> work: limit to <code>runtime.GOMAXPROCS(0)</code> (number of CPU cores). <em>I/O-bound</em> work: can use more goroutines since they spend time waiting. Use worker pools or <code>errgroup.SetLimit()</code> to bound concurrency.<br><br><strong>Channel buffer sizing:</strong> See Week 5 interview focus for detailed guidance on buffer sizing strategies. Key rule: start unbuffered, add buffering only when benchmarks show throughput gains.<br><br><strong>Lock contention:</strong> When many goroutines compete for the same mutex, throughput drops. Solutions: <code>sync.RWMutex</code> (when reads >> writes), <strong>sharding</strong> (split data across multiple locks — e.g., 16-shard map), <strong>lock-free atomics</strong> (for single values), or <strong>channel-based access</strong> (single goroutine owns the data).<br><br><strong>False sharing:</strong> When goroutines on different CPU cores modify variables on the same cache line (~64 bytes), performance degrades due to cache invalidation. Fix with padding: add unused fields to force variables onto different cache lines.<br><br><strong>Race detector:</strong> Use <code>go test -race</code> in CI (covered in detail in Week 5's <em>Race Conditions &amp; Data Races</em> topic).<br><br><strong>Profiling:</strong> <code>pprof</code> provides goroutine profiles (find blocked goroutines), mutex profiles (find contention), CPU profiles, and memory profiles. Import <code>net/http/pprof</code> in development for a web-based profiling endpoint.",
     "interview": "'Optimal goroutine count?' — CPU-bound: GOMAXPROCS. I/O-bound: higher, bounded by worker pool. 'Lock contention solutions?' — RWMutex, sharding, atomics, channel-based access. 'Race detector?' — go test -race; roughly 2-20x CPU and 5-10x memory, so use it in CI and staging. 'False sharing?' — Cache line contention. Fix with padding. 'Profiling tools?' — pprof for goroutine/mutex/CPU/memory profiles.",
     "examples": [
      {
       "label": "Race detection + profiling",
       "lang": "go",
       "code": "// Detect races at run time (instrumented build)\n// go run -race main.go\n// go test -race ./...\n\n// Profile goroutines\nimport _ \"net/http/pprof\"\ngo func() { http.ListenAndServe(\":6060\", nil) }()\n// Visit http://localhost:6060/debug/pprof/goroutine\n\n// Benchmark with -benchmem\n// go test -bench=. -benchmem -count=5"
      },
      {
       "label": "Optimizing contention",
       "lang": "go",
       "code": "// Sharded map to reduce lock contention\ntype shard struct {\n    sync.RWMutex\n    m map[string]any\n}\n\ntype ShardedMap struct {\n    shards [16]shard\n}\n\nfunc NewShardedMap() *ShardedMap {\n    sm := &ShardedMap{}\n    for i := range sm.shards {\n        sm.shards[i].m = make(map[string]any)\n    }\n    return sm\n}\n\nfunc (sm *ShardedMap) shard(key string) *shard {\n    h := fnv.New32a()\n    h.Write([]byte(key))\n    // unsigned modulo: int(h.Sum32()) can be negative on 32-bit platforms\n    return &sm.shards[h.Sum32()%uint32(len(sm.shards))]\n}\n\nfunc (sm *ShardedMap) Get(key string) (any, bool) {\n    s := sm.shard(key)\n    s.RLock()\n    defer s.RUnlock()\n    v, ok := s.m[key]\n    return v, ok\n}\n\nfunc (sm *ShardedMap) Set(key string, v any) {\n    s := sm.shard(key)\n    s.Lock()\n    defer s.Unlock()\n    s.m[key] = v\n}"
      }
     ]
    },
    {
     "title": "Goroutine Leaks: detection, prevention",
     "def": "A <strong>goroutine leak</strong> occurs when a goroutine is started but never terminates — it remains blocked indefinitely on a channel operation, mutex, I/O, or sleep. Leaked goroutines <strong>cannot be garbage collected</strong> because the goroutine's stack and all objects it references remain reachable.<br><br><strong>Memory impact:</strong> Each goroutine consumes ~2-8KB of stack memory plus any heap objects it references. In a long-running server, goroutine leaks accumulate and can cause <strong>OOM (Out of Memory)</strong> crashes. This is one of the most common production issues in Go services.<br><br><strong>Common causes:</strong><br>• <strong>Forgotten channel receiver:</strong> A goroutine sends to a channel that nobody reads from — blocks forever<br>• <strong>Missing channel close:</strong> A consumer <code>range</code>-ing over a channel that the producer never closes — blocks forever after all items consumed<br>• <strong>Context not used:</strong> Long-running goroutine doesn't check <code>ctx.Done()</code> — continues running after parent cancels<br>• <strong>Blocking I/O without timeout:</strong> HTTP client or database call with no timeout set — hangs on network issue<br>• <strong>Goroutine looping on a ticker with no exit:</strong> <code>for range ticker.C { ... }</code>, or a <code>select</code> without a <code>ctx.Done()</code> case, never returns, so the <em>goroutine</em> leaks. The ticker itself has no goroutine: timers and tickers live in the runtime's per-P timer heaps. Since Go 1.23 an unreferenced Ticker is garbage collected even if <code>Stop</code> was never called. Still <code>defer ticker.Stop()</code>: it stops the ticks immediately and is required to free the ticker on Go ≤1.22 (or with go.mod older than 1.23)<br>• <strong>select without done:</strong> A select statement without a cancellation case — goroutine never exits<br><br><strong>Detection:</strong><br>• <code>runtime.NumGoroutine()</code> — check goroutine count before and after operations in tests<br>• <code>go.uber.org/goleak</code> — <code>goleak.VerifyNone(t)</code> in test teardown automatically detects leaked goroutines<br>• <code>pprof</code> goroutine profile — shows all goroutines and their stack traces, identifies where they're blocked<br>• <strong>Monitoring:</strong> Export <code>runtime.NumGoroutine()</code> as a metric — a steadily increasing count indicates leaks<br>• <strong>Goroutine leak profile</strong> (<code>/debug/pprof/goroutineleak</code>; experimental in Go 1.26, on by default in 1.27): the GC marks goroutines blocked on channels, mutexes or conds that no running goroutine can reach, so it reports real leaks rather than merely idle goroutines<br>• <code>testing/synctest</code> (Go 1.25): if a goroutine started in the bubble is still blocked when the test function returns, <code>synctest.Test</code> fails with a deadlock<br><br><strong>Prevention:</strong><br>• Always pass and check <code>context.Context</code> in long-running goroutines<br>• Always <code>defer ticker.Stop()</code> and <code>defer cancel()</code><br>• Every <code>select</code> should have a <code>ctx.Done()</code> or <code>time.After</code> case<br>• Producer must close the channel; consumer must handle closed channels<br>• Set timeouts on all I/O: HTTP clients, database, network",
     "interview": "'What is a goroutine leak?' — A goroutine that never exits (blocked forever or looping without an exit path); its stack and everything it references stay live. 'How to detect?' — NumGoroutine trend metric, pprof goroutine profile (debug=2 shows minutes blocked), goleak or synctest in tests, the goroutineleak profile (Go 1.26 experiment, default in 1.27). 'Common causes?' — Unbuffered send after the receiver gave up (timeouts), missing close(), no ctx.Done() case, I/O without deadlines, unclosed resp.Body. 'Do unstopped tickers leak goroutines?' — No: tickers have no goroutine, and since Go 1.23 unreferenced tickers are GC'd without Stop. The leak is the goroutine ranging over ticker.C with no exit. Still defer Stop (required before 1.23). 'How to prevent?' — Every goroutine needs an owner and an exit path: context, buffered result channels, closed channels, I/O timeouts.",
     "examples": [
      {
       "label": "Goroutine leak patterns",
       "lang": "go",
       "code": "// LEAK 1: channel with no receiver\nfunc leak1() {\n    ch := make(chan int)\n    go func() {\n        val := doWork()\n        ch <- val // blocks forever if nobody reads\n    }()\n    // forgot to read from ch, goroutine leaks\n}\n\n// LEAK 2: missing close on channel\nfunc leak2() {\n    ch := make(chan int)\n    go func() {\n        for i := 0; i < 5; i++ {\n            ch <- i\n        }\n        // forgot close(ch)!\n    }()\n    for v := range ch { // blocks forever after 5 values\n        fmt.Println(v)\n    }\n}\n\n// LEAK 3: no context check\nfunc leak3(ctx context.Context) {\n    go func() {\n        for { // infinite loop, never checks ctx\n            doExpensiveWork()\n        }\n    }()\n}"
      },
      {
       "label": "Prevention patterns",
       "lang": "go",
       "code": "// FIX 1: always use context\nfunc noLeak(ctx context.Context) {\n    go func() {\n        for {\n            select {\n            case <-ctx.Done():\n                return // clean exit\n            default:\n                doWork()\n            }\n        }\n    }()\n}\n\n// FIX 2: buffered channel for fire-and-forget\nfunc noLeak2() {\n    ch := make(chan int, 1) // buffered!\n    go func() {\n        ch <- doWork() // won't block even if no reader\n    }()\n    // if we decide not to read, goroutine still exits\n}\n\n// FIX 3: goleak in tests\nimport \"go.uber.org/goleak\"\nfunc TestNoLeaks(t *testing.T) {\n    defer goleak.VerifyNone(t)\n    // ... your test code ...\n}\n\n// FIX 4: always stop tickers\nticker := time.NewTicker(time.Second)\ndefer ticker.Stop() // stops ticks now; frees the ticker on Go <= 1.22 (it has no goroutine)"
      }
     ]
    },
    {
     "title": "sync.Cond: condition variables",
     "def": "<code>sync.Cond</code> is a <strong>condition variable</strong> — a synchronization primitive that lets goroutines <strong>wait for a condition to become true</strong>, then be efficiently woken up when the condition changes. It's the Go equivalent of POSIX <code>pthread_cond_t</code> or Java's <code>Object.wait()/notify()</code>.<br><br><strong>When to use sync.Cond:</strong> Use when multiple goroutines need to wait for a <strong>shared condition</strong> to change, and you want to efficiently wake them up. Common scenarios: bounded buffers (producer-consumer with capacity), event notification systems, barrier synchronization, resource pool management.<br><br><strong>Three operations:</strong><br>• <code>cond.Wait()</code> — atomically releases the associated lock (Mutex or RWMutex), suspends the goroutine, and re-acquires the lock when woken. <strong>Must be called while holding the lock.</strong> Must always be called in a <code>for</code> loop re-checking the condition (not <code>if</code>); the reason is explained below.<br>• <code>cond.Signal()</code> — wakes <strong>one</strong> waiting goroutine (if any). Like <code>notify()</code> in Java.<br>• <code>cond.Broadcast()</code> — wakes <strong>all</strong> waiting goroutines. Like <code>notifyAll()</code> in Java.<br><br><strong>Why loop, not if?</strong> Between the wakeup and re-acquiring the lock, another goroutine may have changed the condition back. The loop re-checks to ensure the condition truly holds. Unlike pthreads or Java, Go's <code>Wait</code> has <strong>no spurious wakeups</strong>: it returns only after a <code>Signal</code> or <code>Broadcast</code>. The loop is needed anyway because (1) the waker releases the lock before the woken goroutine re-acquires it, so another goroutine can get in first and consume the condition (take the item, fill the slot); (2) <code>Broadcast</code> wakes every waiter, but only some of them may find the condition still true; and (3) a <code>Signal</code> only means \"something changed\", not that your particular condition holds. <code>Wait</code> cannot be combined with <code>select</code>, a timeout or a context, so for cancellable waits prefer channels (closing a channel is a broadcast).<br><br><strong>sync.Cond vs channels:</strong> Channels are generally preferred in Go for communication. Use sync.Cond when: (1) multiple goroutines wait for the same condition, (2) you need Broadcast to wake all waiters, (3) the condition is more complex than 'a value is available'. Channels can't efficiently broadcast to an unknown number of waiters.<br><br><strong>Pitfalls:</strong> (1) Calling Wait() without holding the lock panics. (2) Using <code>if</code> instead of <code>for</code> breaks as soon as another goroutine consumes the condition first, or when a Broadcast wakes several waiters. (3) Forgetting to call Signal/Broadcast means waiters block forever. (4) sync.Cond is NOT used as commonly as channels — don't reach for it by default.",
     "interview": "'What is sync.Cond?' — Condition variable: wait for condition, get woken up by Signal (one) or Broadcast (all). 'Wait() in a loop, not if — why?' — Not because of spurious wakeups (Go's Wait has none): the condition can change between Signal/Broadcast and re-acquiring the lock (another goroutine may grab it first), and Broadcast wakes all waiters though only some can proceed. 'Cond with a timeout?' — Not possible directly; use channels, or context.AfterFunc to Broadcast on cancel. 'sync.Cond vs channels?' — Cond: multiple waiters on same condition, broadcast. Channels: data transfer, single consumer. 'Common use cases?' — Bounded buffer, event notification, barrier sync, resource pools.",
     "examples": [
      {
       "label": "Bounded buffer with sync.Cond",
       "lang": "go",
       "code": "type BoundedBuffer struct {\n    buf      []int\n    capacity int\n    mu       sync.Mutex\n    notFull  *sync.Cond\n    notEmpty *sync.Cond\n}\n\nfunc NewBuffer(cap int) *BoundedBuffer {\n    b := &BoundedBuffer{capacity: cap}\n    b.notFull = sync.NewCond(&b.mu)\n    b.notEmpty = sync.NewCond(&b.mu)\n    return b\n}\n\nfunc (b *BoundedBuffer) Put(val int) {\n    b.mu.Lock()\n    defer b.mu.Unlock()\n    for len(b.buf) == b.capacity {\n        b.notFull.Wait() // wait until not full\n    }\n    b.buf = append(b.buf, val)\n    b.notEmpty.Signal() // wake one consumer\n}\n\nfunc (b *BoundedBuffer) Get() int {\n    b.mu.Lock()\n    defer b.mu.Unlock()\n    for len(b.buf) == 0 {\n        b.notEmpty.Wait() // wait until not empty\n    }\n    val := b.buf[0]\n    b.buf = b.buf[1:]\n    b.notFull.Signal() // wake one producer\n    return val\n}"
      },
      {
       "label": "Broadcast pattern — event notification",
       "lang": "go",
       "code": "// Event that multiple goroutines wait for\ntype Event struct {\n    fired bool\n    mu    sync.Mutex\n    cond  *sync.Cond\n}\n\nfunc NewEvent() *Event {\n    e := &Event{}\n    e.cond = sync.NewCond(&e.mu)\n    return e\n}\n\nfunc (e *Event) Wait() {\n    e.mu.Lock()\n    defer e.mu.Unlock()\n    for !e.fired { // MUST be for loop, not if\n        e.cond.Wait()\n    }\n}\n\nfunc (e *Event) Fire() {\n    e.mu.Lock()\n    defer e.mu.Unlock()\n    e.fired = true\n    e.cond.Broadcast() // wake ALL waiters\n}\n\n// Usage: 10 goroutines wait for startup\nevent := NewEvent()\nfor i := 0; i < 10; i++ {\n    go func(id int) {\n        event.Wait()\n        fmt.Printf(\"worker %d: event fired!\\n\", id)\n    }(i)\n}\ntime.Sleep(time.Second)\nevent.Fire() // all 10 goroutines wake up"
      }
     ]
    },
    {
     "title": "Go Memory Model: happens-before",
     "def": "The <strong>Go Memory Model</strong> specifies the conditions under which a read of a variable in one goroutine is guaranteed to observe a value written by a different goroutine. Without synchronization, the Go compiler and CPU hardware are free to <strong>reorder memory operations</strong> for performance — meaning goroutine B may see goroutine A's writes in a different order than they occurred.<br><br><strong>Happens-before relationship:</strong> If event A <em>happens before</em> event B, then A's effects (memory writes) are <strong>guaranteed visible</strong> to B. Without a happens-before relationship, there are <strong>no guarantees</strong> about visibility.<br><br><strong>Go's happens-before guarantees:</strong><br>• <strong>Channel send</strong> happens before the corresponding <strong>channel receive</strong> completes<br>• <strong>Channel close</strong> happens before a receive that returns the zero value (for closed channel)<br>• <strong>Unbuffered channel receive</strong> happens before the send completes (both directions!)<br>• <strong>sync.Mutex Unlock()</strong> happens before the next Lock() on the same mutex<br>• <strong>sync.Once.Do(f)</strong> — the call to f() happens before any Do() call returns<br>• <strong>sync.WaitGroup Done()</strong> happens before Wait() returns<br>• <strong>Goroutine creation:</strong> the <code>go</code> statement happens before the goroutine starts<br>• <strong>Program init:</strong> package init() functions happen before main()<br><br><strong>What this means practically:</strong><br>• Without synchronization, one goroutine's writes to a variable may <strong>never be seen</strong> by another goroutine — the compiler may keep the value in a register, or the CPU may use a stale cache line<br>• <strong>Double-checked locking without sync is broken</strong> — even if a pointer appears non-nil, the pointed-to struct's fields may not be initialized yet<br>• <strong>Flag variables without atomic/mutex are broken</strong> — setting <code>done = true</code> in one goroutine may never be observed by another<br><br><strong>Safe patterns:</strong> Use channels, mutexes, atomic operations, sync.Once, sync.WaitGroup, or sync.Cond to establish happens-before relationships. These are the ONLY ways to safely share data between goroutines.<br><br><strong>More rules worth knowing:</strong><br>• Go 1.19 restated the model in the style of C++ and Java (DRF-SC: data-race-free programs behave sequentially consistently). <code>sync/atomic</code> operations are sequentially consistent, and if atomic read B observes atomic write A, then A is synchronized before B, so plain writes made before A are visible after B.<br>• For a buffered channel with capacity C, the k-th receive is synchronized before the (k+C)-th send completes. This is why a buffered channel works as a counting semaphore.<br>• <strong>Goroutine exit is not synchronized with anything.</strong> You must use a WaitGroup, channel or mutex to observe a goroutine's writes.<br>• Racy programs are not just \"stale\": races on multi-word values (interfaces, slices, strings) can tear and crash. The compiler may also hoist a non-atomic load out of a loop, which is why <code>for !done {}</code> can spin forever.",
     "interview": "'What is the Go memory model?' — It defines when a goroutine is guaranteed to see values written by another goroutine. Without synchronization, there are NO visibility guarantees. 'Happens-before?' — A formal ordering: if A happens-before B, B sees A's writes. Established by channel ops, mutex, atomic, WaitGroup, etc. 'Can you use a bool flag for goroutine signaling?' — No. Without atomic/mutex, the flag write may never be visible to the reading goroutine. Use atomic.Bool or a channel. 'Channel happens-before?' — Send happens-before receive completes. For unbuffered: receive also happens-before send completes. 'Does a goroutine finishing make its writes visible?' — No; goroutine exit synchronizes with nothing, so use WaitGroup.Wait, a channel or a mutex. 'Buffered channel as semaphore — why is it correct?' — The k-th receive is synchronized before the (k+C)-th send completes.",
     "examples": [
      {
       "label": "Memory visibility without sync (broken)",
       "lang": "go",
       "code": "// BROKEN: no guarantee 'done' is visible\nvar done bool\nvar result int\n\ngo func() {\n    result = 42\n    done = true // write may never be seen!\n}()\n\nfor !done { // may loop forever!\n    // compiler may optimize: load done once\n    // into register and never re-read from memory\n}\nfmt.Println(result) // may print 0!\n\n// FIX 1: use a channel\nch := make(chan int)\ngo func() {\n    result := 42\n    ch <- result // happens-before receive\n}()\nfmt.Println(<-ch) // guaranteed to see 42\n\n// FIX 2: use atomic\nvar done atomic.Bool\nvar result atomic.Int64\ngo func() {\n    result.Store(42)\n    done.Store(true)\n}()\nfor !done.Load() {} // guaranteed to eventually see true\nfmt.Println(result.Load()) // guaranteed 42"
      },
      {
       "label": "Happens-before with channels",
       "lang": "go",
       "code": "// Channel send happens-before receive completes\nvar data string\nch := make(chan struct{})\n\ngo func() {\n    data = \"hello\" // write\n    ch <- struct{}{} // send: establishes happens-before\n}()\n\n<-ch // receive: guaranteed to see data = \"hello\"\nfmt.Println(data) // safe: always prints \"hello\"\n\n// Unbuffered: receive ALSO happens-before send completes\nch2 := make(chan struct{})\ngo func() {\n    <-ch2 // receive happens-before send completes\n    fmt.Println(data) // guaranteed to see \"hello\"\n}()\ndata = \"hello\"\nch2 <- struct{}{} // send completes after receive\n\n// sync.Once: f() happens-before any Do() returns\nvar once sync.Once\nvar config *Config\nonce.Do(func() {\n    config = loadConfig() // happens-before\n})\n// config is guaranteed to be fully initialized here"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Context HTTP client",
     "type": "coding",
     "solution": "req, _ := http.NewRequestWithContext(ctx, \"GET\", url, nil)\nresp, err := http.DefaultClient.Do(req)\nif err != nil { return err }\ndefer resp.Body.Close()",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Request ID propagation",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    },
    {
     "t": "Context logger",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/logs-logs-logs"
    },
    {
     "t": "Context retry",
     "type": "coding",
     "url": "https://leetcode.com/problems/retry-failed-requests/"
    },
    {
     "t": "Context scheduler",
     "type": "coding",
     "url": "https://leetcode.com/problems/task-scheduler/"
    },
    {
     "t": "Context circuit breaker",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/error-handling"
    },
    {
     "t": "Distributed lock",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-bounded-blocking-queue/"
    },
    {
     "t": "Tracing middleware",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Auth middleware",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Request validation",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/luhn"
    },
    {
     "t": "Context timeout",
     "type": "coding",
     "id": "w6_acode_0",
     "solution": "func work(ctx context.Context) error {\n    ch := make(chan string)\n    go func() { time.Sleep(2*time.Second); ch<-\"done\" }()\n    select { case <-ch: return nil; case <-ctx.Done(): return ctx.Err() }\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Context value",
     "type": "coding",
     "id": "w6_acode_1",
     "solution": "type k string\nctx := context.WithValue(context.Background(), k(\"uid\"), \"123\")\nfmt.Println(ctx.Value(k(\"uid\")))",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    },
    {
     "t": "errgroup",
     "type": "coding",
     "id": "w6_acode_2",
     "solution": "g, ctx := errgroup.WithContext(ctx)\ng.Go(func() error { return task(ctx) })\nreturn g.Wait()",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/parallel-letter-frequency"
    },
    {
     "t": "Atomic",
     "type": "coding",
     "id": "w6_acode_3",
     "solution": "var c atomic.Int64\nc.Add(1); c.Add(1)\nfmt.Println(c.Load())",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Find and fix the goroutine leak in a timeout wrapper",
     "d": "medium",
     "type": "debug",
     "hint": "In the buggy code the worker sends its result on an <strong>unbuffered</strong> channel. When the caller times out first, nobody ever receives, so every timed-out request leaks one goroutine together with everything it references (a steadily rising <code>go_goroutines</code> metric, and pprof showing thousands of goroutines in <code>chan send</code>). Fix both halves: make the result channel <strong>buffered (capacity 1)</strong> so the send always completes, and pass a <strong>derived context</strong> into the work so it stops early (<code>defer cancel()</code>). Prove the fix with <code>testing/synctest</code>: the buggy version fails with \"deadlock: main bubble goroutine has exited but blocked goroutines remain\".",
     "lang": "go",
     "solution": "// BUGGY: on timeout nobody receives from ch, so the worker blocks forever.\nfunc lookupLeaky(ctx context.Context, id string) (Result, error) {\n    ch := make(chan Result) // unbuffered\n    go func() {\n        r, _ := slowLookup(context.Background(), id) // also ignores ctx\n        ch <- r                                       // blocks forever after a timeout\n    }()\n    select {\n    case r := <-ch:\n        return r, nil\n    case <-time.After(500 * time.Millisecond):\n        return Result{}, errors.New(\"timeout\")\n    }\n}\n\n// FIXED: buffered result channel + the caller's ctx flows into the worker.\nfunc lookup(ctx context.Context, id string) (Result, error) {\n    ctx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)\n    defer cancel() // stops slowLookup as soon as we return\n\n    type res struct {\n        r   Result\n        err error\n    }\n    ch := make(chan res, 1) // the send always completes, even if nobody reads\n    go func() {\n        r, err := slowLookup(ctx, id)\n        ch <- res{r, err}\n    }()\n    select {\n    case out := <-ch:\n        return out.r, out.err\n    case <-ctx.Done():\n        return Result{}, fmt.Errorf(\"lookup %s: %w\", id, ctx.Err())\n    }\n}\n\n// Regression test (Go 1.25+): fails with a deadlock for lookupLeaky.\nfunc TestLookupNoLeak(t *testing.T) {\n    synctest.Test(t, func(t *testing.T) {\n        if _, err := lookup(context.Background(), \"42\"); err == nil {\n            t.Fatal(\"want timeout error\")\n        }\n    })\n}"
    }
   ],
   "interviewFocus": [
    {
     "q": "How does context cancellation propagate through a call chain?",
     "a": "When you call <code>context.WithCancel(parent)</code>, the child context's <code>Done()</code> channel closes when either: (1) the parent is cancelled, or (2) the cancel function is called. This propagates through the entire tree — cancelling a parent cancels all descendants. In HTTP servers, <code>r.Context()</code> is cancelled when the client disconnects. You must pass context through every function in the chain: handler → service → repository → DB query. Use <code>select</code> with <code>ctx.Done()</code> to respond to cancellation in long-running operations. Always <code>defer cancel()</code> to prevent resource leaks."
    },
    {
     "q": "Context vs channel for cancellation — when to use each?",
     "a": "<strong>Context</strong>: use for request-scoped cancellation that flows through a call chain. Supports hierarchical cancellation (parent cancels children), deadlines, and request-scoped values (trace ID, auth). <strong>Channel</strong> (<code>done chan struct{}</code>): use for simple one-off signaling between goroutines, especially when you don't need the full context features. Context is the standard for HTTP handlers, gRPC, database operations. Channels are better for internal worker coordination. Rule: if you're in a request handler, always use context."
    },
    {
     "q": "What are the anti-patterns with context.WithValue?",
     "a": "Anti-patterns: (1) Passing <strong>function parameters</strong> as context values — use proper function arguments instead. (2) Using <strong>string keys</strong> — use unexported custom types to prevent collisions: <code>type ctxKey string</code>. (3) Storing <strong>mutable data</strong> — context values should be immutable and request-scoped. (4) Using context for <strong>dependency injection</strong> — pass dependencies explicitly. Valid uses: request ID, trace span, authenticated user, deadline metadata. Never put database connections, loggers, or configuration in context values."
    },
    {
     "q": "How do goroutine leaks cause memory issues and how do you detect them?",
     "a": "A goroutine leak occurs when a goroutine is blocked indefinitely (on channel, mutex, or I/O) and cannot be garbage collected — each leaked goroutine holds its ~2-8KB stack plus any referenced objects. Detection: (1) <code>runtime.NumGoroutine()</code> in tests — assert count returns to baseline. (2) <code>pprof</code> goroutine profile shows blocked goroutines. (3) <code>goleak</code> or <code>testing/synctest</code> (Go 1.25) for automated test detection. (4) The goroutineleak profile (experimental in Go 1.26, default in 1.27), which uses the GC to find goroutines blocked on unreachable channels or locks. Prevention: always use <code>context.WithTimeout</code>, ensure channels have senders/receivers, close channels when done, use <code>select</code> with cancellation."
    }
   ],
   "quiz": [
    {
     "q": "Context?",
     "a": "Cancellation, deadlines, request values."
    },
    {
     "q": "WithCancel?",
     "a": "ctx, cancel := context.WithCancel(parent)"
    },
    {
     "q": "WithTimeout?",
     "a": "ctx, cancel := context.WithTimeout(parent, dur)"
    },
    {
     "q": "Cancelled?",
     "a": "Done() closed, children cancelled."
    },
    {
     "q": "errgroup?",
     "a": "Goroutine group: error + context."
    },
    {
     "q": "Atomic?",
     "a": "Lock-free concurrent access."
    },
    {
     "q": "Context values when?",
     "a": "Request-scoped: IDs, auth, tracing."
    },
    {
     "q": "Background()?",
     "a": "Root, never cancelled."
    },
    {
     "q": "Does an unstopped time.Ticker leak a goroutine?",
     "a": "No. Tickers have no goroutine, and since Go 1.23 unreferenced tickers are garbage collected even without Stop. The leak is a goroutine looping on ticker.C with no exit. Still defer Stop (required before 1.23)."
    },
    {
     "q": "Does sync.Cond.Wait have spurious wakeups?",
     "a": "No, it returns only after Signal/Broadcast. Loop anyway: the condition can change before the lock is re-acquired, and Broadcast wakes everyone."
    },
    {
     "q": "Are atomics always faster than a mutex?",
     "a": "Uncontended, usually yes; contended atomics still bounce the cache line between cores, so shard hot counters and measure."
    },
    {
     "q": "Does goroutine exit synchronize with anything?",
     "a": "No. Use WaitGroup, a channel or a mutex to observe its writes."
    }
   ],
   "resources": [
    {
     "title": "Concurrency Concepts",
     "url": "https://www.youtube.com/watch?v=6QaRYpEWsUQ",
     "type": "video"
    },
    {
     "title": "justforfunc: Context",
     "url": "https://www.youtube.com/c/JustForFunc",
     "type": "video"
    },
    {
     "title": "The Go Memory Model",
     "url": "https://go.dev/ref/mem",
     "type": "docs"
    },
    {
     "title": "Go Blog — Go Concurrency Patterns: Context",
     "url": "https://go.dev/blog/context",
     "type": "article"
    },
    {
     "title": "Go package context",
     "url": "https://pkg.go.dev/context",
     "type": "docs"
    }
   ]
  },
  {
   "n": 7,
   "title": "Network Programming & APIs",
   "group": "Core Go (Weeks 1–8)",
   "topics": [
    {
     "title": "HTTP server: net/http, handlers, middleware",
     "def": "Go's <code>net/http</code> package provides a <strong>production-grade HTTP server</strong> — the same package powers services at Google, Cloudflare, and Uber. No framework is required for most use cases.<br><br><strong>Key components:</strong><br>• <code>http.Handler</code> interface: one method — <code>ServeHTTP(w ResponseWriter, r *Request)</code>. Any type implementing this is a handler.<br>• <code>http.HandlerFunc</code>: adapter that lets you use ordinary functions as handlers.<br>• <code>http.ServeMux</code> (Go 1.22+): enhanced pattern matching: method matching (<code>GET /users/{id}</code>, and GET also matches HEAD), wildcards read with <code>r.PathValue(\"id\")</code>, <code>{path...}</code> for the rest of the path, and <code>{$}</code> to match only the exact path. The <em>most specific</em> pattern wins, and registering two conflicting patterns panics at startup. A path that matches only for other methods gets an automatic <code>405</code> with an <code>Allow</code> header.<br>• <code>http.Server</code>: configurable server with timeouts. <strong>Always set timeouts in production</strong>, especially <code>ReadHeaderTimeout</code> (slowloris; gosec flags its absence), <code>ReadTimeout</code>, <code>WriteTimeout</code> (or per-handler <code>http.NewResponseController(w).SetWriteDeadline</code> for streaming) and <code>IdleTimeout</code>, and cap request bodies with <code>http.MaxBytesReader</code>. <code>Server.Protocols</code> (Go 1.24) enables HTTP/1 and HTTP/2, including unencrypted HTTP/2. <code>http.CrossOriginProtection</code> (Go 1.25) gives token-less CSRF protection based on <code>Sec-Fetch-Site</code>/<code>Origin</code>.<br><br><strong>Middleware pattern:</strong> <code>func(http.Handler) http.Handler</code> — a function that wraps a handler and returns a new handler. This enables cross-cutting concerns like logging, authentication, CORS, rate limiting, and panic recovery. Middleware is applied in reverse order: the last wrapper executes first (outermost layer).<br><br><strong>Graceful shutdown:</strong> <code>server.Shutdown(ctx)</code> stops accepting new connections, waits for in-flight requests to complete (up to context deadline), then returns. Essential for production services running in Kubernetes or behind load balancers.",
     "interview": "'net/http vs frameworks (Gin/Echo)?' — net/http is sufficient for most APIs, especially with Go 1.22 routing enhancements. Frameworks add convenience (binding, validation) but add dependencies. 'Middleware order?' — Last applied runs first (outermost). 'Graceful shutdown?' — server.Shutdown(ctx) for zero-downtime deploys. 'Must-set timeouts?' — ReadHeaderTimeout (slowloris), ReadTimeout, WriteTimeout, IdleTimeout, plus MaxBytesReader on bodies. 'Go 1.22 routing?' — Method + wildcard patterns, r.PathValue, most-specific-wins, automatic 405.",
     "examples": [
      {
       "label": "Production server with middleware",
       "lang": "go",
       "code": "func logging(next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        start := time.Now()\n        next.ServeHTTP(w, r)\n        log.Printf(\"%s %s %v\", r.Method, r.URL.Path, time.Since(start))\n    })\n}\n\nfunc recovery(next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        defer func() {\n            if err := recover(); err != nil {\n                http.Error(w, \"Internal Server Error\", 500)\n                log.Printf(\"panic: %v\", err)\n            }\n        }()\n        next.ServeHTTP(w, r)\n    })\n}\n\nmux := http.NewServeMux()\nmux.HandleFunc(\"GET /api/users/{id}\", getUser) // Go 1.22+: r.PathValue(\"id\")\nmux.HandleFunc(\"POST /api/users\", createUser)\nmux.HandleFunc(\"GET /{$}\", home)               // only \"/\", not every path\nhandler := recovery(logging(mux))"
      },
      {
       "label": "Graceful shutdown",
       "lang": "go",
       "code": "srv := &http.Server{\n    Addr:         \":8080\",\n    Handler:      handler,\n    ReadHeaderTimeout: 5 * time.Second, // slowloris protection\n    ReadTimeout:  15 * time.Second,\n    WriteTimeout: 15 * time.Second,\n    IdleTimeout:  60 * time.Second,\n}\n\n// Start server in goroutine\ngo func() {\n    if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {\n        log.Fatal(err)\n    }\n}()\n\n// Wait for interrupt signal\nquit := make(chan os.Signal, 1)\nsignal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)\n<-quit\n\n// Graceful shutdown with 30s deadline\nctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)\ndefer cancel()\nif err := srv.Shutdown(ctx); err != nil {\n    log.Fatal(\"forced shutdown:\", err)\n}\nlog.Println(\"server exited gracefully\")"
      }
     ]
    },
    {
     "title": "HTTP client",
     "def": "Go's <code>http.Client</code> is a <strong>production-grade HTTP client</strong> with built-in connection pooling, redirect handling, cookie management, and configurable timeouts. Unlike many languages, Go's HTTP client is fully featured out of the box.<br><br><strong>Critical: Always set timeouts.</strong> The default <code>http.DefaultClient</code> has <strong>no timeout</strong> — requests will hang forever if the server doesn't respond. This is one of the most common production bugs in Go. Always create a custom client: <code>&http.Client{Timeout: 10 * time.Second}</code>.<br><br><strong>Connection pooling:</strong> The client automatically reuses TCP connections via <code>http.Transport</code>. Key transport settings: <code>MaxIdleConns</code> (total idle connections), <code>MaxIdleConnsPerHost</code> (per-host idle), <code>IdleConnTimeout</code> (recycle idle connections). <strong>Reuse the client</strong> (more precisely, its Transport) across requests. Creating a new Transport per request disables pooling and leaks idle connections. Note that <code>DefaultMaxIdleConnsPerHost</code> is only <strong>2</strong>: a service that makes many concurrent calls to a single host should raise <code>MaxIdleConnsPerHost</code>, otherwise connections churn and TIME_WAIT sockets pile up. <code>MaxConnsPerHost</code> caps the total number of connections per host.<br><br><strong>Context-aware requests:</strong> Use <code>http.NewRequestWithContext(ctx, method, url, body)</code> to tie HTTP requests to a context. When the context is cancelled (e.g., user disconnects), the HTTP request is also cancelled. This prevents wasted work and connection leaks.<br><br><strong>Response body:</strong> <code>resp.Body</code> <strong>must always be closed</strong> (<code>defer resp.Body.Close()</code>), even if you don't read it. Unclosed bodies prevent connection reuse and eventually exhaust the connection pool. Also read the body fully before closing for proper connection recycling: <code>io.Copy(io.Discard, resp.Body)</code>.<br><br><strong>Retry and resilience:</strong> <code>http.Transport</code> has one narrow built-in retry. When it sends a request on a <em>reused</em> keep-alive connection and that connection turns out to be dead (for example, the server closed it at its idle timeout) <strong>before any response bytes arrive</strong>, it transparently re-sends the request on a new connection. This happens only if the request can be replayed: a nil body or <code>GetBody</code> set (<code>NewRequest</code> sets it for bytes and strings readers), <em>and</em> an idempotent method (GET, HEAD, OPTIONS, TRACE) or an <code>Idempotency-Key</code> / <code>X-Idempotency-Key</code> header. If nothing at all had been written yet, any request with a rewindable body is retried. It never retries on 5xx responses, on timeouts, or once a response has started. For application-level resilience, add your own retries with exponential backoff and jitter on transient errors (or <code>hashicorp/go-retryablehttp</code>), honor <code>Retry-After</code>, set a retry budget, and only retry operations that are idempotent.",
     "interview": "'Default client pitfall?' — No timeout! Requests hang forever. Always set Timeout. 'Connection pooling?' — Client reuses TCP via Transport. Reuse the client across requests. 'Must-do with response?' — Always defer resp.Body.Close(). Read body fully for connection reuse. 'Context in HTTP client?' — NewRequestWithContext ties request to context cancellation. 'Does the client retry?' — Only narrowly: Transport re-sends a replayable request (idempotent method or Idempotency-Key header, rewindable body) when a reused keep-alive connection fails before any response bytes arrive. No retries on 5xx or timeouts, so add backoff + jitter + budgets yourself. 'MaxIdleConnsPerHost default?' — 2; raise it for busy clients.",
     "examples": [
      {
       "label": "Production HTTP client",
       "lang": "go",
       "code": "var client = &http.Client{\n    Timeout: 10 * time.Second, // whole exchange, including reading the body\n    Transport: &http.Transport{\n        MaxIdleConns:        100,\n        MaxIdleConnsPerHost: 32, // default is only 2\n        IdleConnTimeout:     90 * time.Second,\n    },\n}\n\nfunc getUser(ctx context.Context, url, token string) (*User, error) {\n    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)\n    if err != nil {\n        return nil, err\n    }\n    req.Header.Set(\"Authorization\", \"Bearer \"+token)\n    resp, err := client.Do(req)\n    if err != nil {\n        return nil, err\n    }\n    defer resp.Body.Close()\n    if resp.StatusCode != http.StatusOK {\n        io.Copy(io.Discard, io.LimitReader(resp.Body, 64<<10)) // drain so the conn is reused\n        return nil, fmt.Errorf(\"GET %s: %s\", url, resp.Status)\n    }\n    var u User\n    if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {\n        return nil, fmt.Errorf(\"decode user: %w\", err)\n    }\n    return &u, nil\n}"
      },
      {
       "label": "POST with JSON body",
       "lang": "go",
       "code": "data := map[string]string{\"name\": \"John\"}\nbody, err := json.Marshal(data)\nif err != nil {\n    return err\n}\nreq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))\nif err != nil {\n    return err\n}\nreq.Header.Set(\"Content-Type\", \"application/json\")\nreq.Header.Set(\"Idempotency-Key\", uuid.NewString()) // makes POST safe to retry\nresp, err := client.Do(req)\nif err != nil {\n    return err // check the error BEFORE touching resp\n}\ndefer resp.Body.Close()"
      }
     ]
    },
    {
     "title": "Serialization & Deserialization (JSON, XML, Gob, Protobuf)",
     "def": "Serialization converts Go values into bytes for storage or transmission; deserialization reconstructs values from bytes. Go provides several encoders under <code>encoding/*</code>, each suited to different tradeoffs.<br><br><strong>JSON (<code>encoding/json</code>):</strong> Human-readable, web-API standard. Struct tags (<code>json:\"name,omitempty\"</code>) map fields. <code>json.Marshal</code>/<code>Unmarshal</code> work with <code>[]byte</code>; <code>json.NewEncoder(w).Encode(v)</code> and <code>json.NewDecoder(r).Decode(&v)</code> stream to <code>io.Writer</code>/<code>io.Reader</code>. Use <code>json.RawMessage</code> to delay parsing, <code>json.Number</code> to avoid float64 precision loss, and <code>json.Marshaler</code>/<code>json.Unmarshaler</code> for custom formats.<br><br><strong>XML (<code>encoding/xml</code>):</strong> Common for enterprise/SOAP interop. Tags control element names, attributes, and character data: <code>xml:\"name\"</code>, <code>xml:\"parent&gt;child\"</code>, <code>xml:\"id,attr\"</code>, <code>xml:\",chardata\"</code>.<br><br><strong>Gob (<code>encoding/gob</code>):</strong> Go-specific binary format, self-describing, preserves complex Go types (slices, maps, interfaces). Fast and easy for Go-to-Go communication (RPC, caching), but not cross-language. Register interface implementations with <code>gob.Register</code>.<br><br><strong>Protocol Buffers (<code>google.golang.org/protobuf</code>):</strong> Language-neutral, schema-driven binary format. Define <code>.proto</code> files and generate Go code with <code>protoc</code>. Compact, fast, version-tolerant, strongly typed; ideal for microservices and gRPC.<br><br><strong>Binary (<code>encoding/binary</code>):</strong> Low-level encoding of fixed-size primitives with explicit <code>ByteOrder</code> (LittleEndian/BigEndian). Use <code>binary.Read</code>/<code>Write</code> for custom protocols, file headers, and packet formats.<br><br><strong>Cross-cutting patterns:</strong><br>• Prefer streaming <code>Encoder</code>/<code>Decoder</code> over <code>Marshal</code>/<code>Unmarshal</code> when reading from HTTP or writing to files to avoid intermediate byte slices.<br>• Implement custom marshalers for enums, dates, IDs, or computed fields.<br>• Handle unknown or optional fields: protobuf uses field numbers; JSON can use <code>json.RawMessage</code> or <code>map[string]any</code>.<br>• Choose format by need: human-readable/debuggable (JSON/XML), cross-language performance (protobuf), Go-only speed (gob), fixed low-level control (binary).<br><br><strong>Modern encoding/json:</strong><br>• <code>omitzero</code> (Go 1.24) omits zero values, including <code>time.Time{}</code> and zero structs, which <code>omitempty</code> never could; a type can define <code>IsZero() bool</code>.<br>• <code>encoding/json/v2</code> plus <code>encoding/json/jsontext</code> shipped as <code>GOEXPERIMENT=jsonv2</code> in Go 1.25–1.26 and are enabled by default in Go 1.27, where v1 is implemented on top of v2. v2 is stricter by default: case-sensitive field matching, rejection of duplicate keys and invalid UTF-8, and nil slices and maps marshal as <code>[]</code>/<code>{}</code>. It is also significantly faster at decoding, and behaviour is configured with options.<br>• Security: wrap request bodies in <code>http.MaxBytesReader</code>, consider <code>Decoder.DisallowUnknownFields</code>, and remember v1 matches keys case-insensitively, which has been abused to smuggle fields.",
     "interview": "'JSON Marshal vs Encoder?' — Marshal returns a []byte; Encoder streams to an io.Writer and avoids an in-memory copy. 'omitempty vs omitzero?' — omitempty skips false, 0, \"\", nil and empty collections, but never structs; omitzero (Go 1.24) skips zero values including time.Time{} and zero structs, or uses IsZero(). 'json/v2?' — GOEXPERIMENT in 1.25-1.26, default in 1.27; stricter defaults and faster decoding. 'JSON vs Protobuf?' — JSON is human-readable and schemaless but slower; Protobuf is binary, schema-driven, smaller/faster, and cross-language. 'When is gob appropriate?' — Go-only services, RPC, or caches; not for external clients. 'Custom JSON marshaling?' — Implement json.Marshaler/json.Unmarshaler. 'XML vs JSON in Go?' — JSON for web APIs; XML for enterprise/SOAP integration. 'Handle unknown JSON fields?' — Use json.RawMessage or map[string]any, or ignore extras. 'Schema evolution?' — Protobuf: add new field numbers, never reuse; JSON: additive changes are safe, avoid renaming keys.",
     "examples": [
      {
       "label": "JSON marshal, unmarshal, and struct tags",
       "lang": "go",
       "code": "type User struct {\n    ID    int       `json:\"id,string,omitempty\"`\n    Name  string    `json:\"name\"`\n    Email string    `json:\"email\"`\n}\n\nu := User{ID: 1, Name: \"Alice\", Email: \"alice@example.com\"}\nb, _ := json.Marshal(u)\nfmt.Println(string(b))\n\nvar u2 User\nif err := json.Unmarshal(b, &u2); err != nil {\n    panic(err)\n}"
      },
      {
       "label": "XML, gob, protobuf, and binary snippets",
       "lang": "go",
       "code": "// XML\nxmlData, _ := xml.Marshal(struct {\n    Title string `xml:\"title\"`\n    ISBN  string `xml:\"isbn,attr\"`\n}{Title: \"Go in Action\", ISBN: \"123\"})\n\n// Gob (Go-to-Go binary)\ntype Person struct { Name string }\np := Person{Name: \"Alice\"}\n\nvar buf bytes.Buffer\nenc := gob.NewEncoder(&buf)\n_ = enc.Encode(p)\n\ndec := gob.NewDecoder(&buf)\nvar q Person\n_ = dec.Decode(&q)\n\n// Protocol Buffers (generated types)\n// out, _ := proto.Marshal(pb)\n// _ = proto.Unmarshal(out, &pb)\n\n// encoding/binary\nb := make([]byte, 4)\nbinary.LittleEndian.PutUint32(b, 42)\nfmt.Println(binary.LittleEndian.Uint32(b))"
      }
     ]
    },
    {
     "title": "REST APIs: design, status codes",
     "def": "<strong>REST</strong> (Representational State Transfer) is an architectural style for designing web APIs around <strong>resources</strong> (nouns, not verbs) using standard HTTP methods.<br><br><strong>HTTP methods on resources:</strong><br>• <code>GET /users</code> — list all (200 OK)<br>• <code>POST /users</code> — create new (201 Created with Location header)<br>• <code>GET /users/{id}</code> — read one (200 OK or 404 Not Found)<br>• <code>PUT /users/{id}</code> — full update / replace (200 OK)<br>• <code>PATCH /users/{id}</code> — partial update (200 OK)<br>• <code>DELETE /users/{id}</code> — delete (204 No Content)<br><br><strong>Key principles:</strong><br>• <strong>Stateless:</strong> each request contains all information needed. No server-side session state.<br>• <strong>Resource-oriented:</strong> URLs represent resources (<code>/users</code>), not actions (<code>/getUsers</code>).<br>• <strong>Idempotency:</strong> GET, PUT, DELETE are idempotent (same request = same result). POST is NOT idempotent (creates new resource each time). PATCH may or may not be idempotent.<br>• <strong>HATEOAS:</strong> responses include links to related resources (rarely implemented in practice).<br><br><strong>Status codes (must-know for interviews):</strong> 401 means \"not authenticated\" (send credentials) and 403 means \"authenticated but not allowed\". 200 OK, 201 Created, 204 No Content, 301 Moved Permanently, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests, 500 Internal Server Error, 503 Service Unavailable.<br><br><strong>Pagination:</strong> <em>Offset/limit</em> (<code>?offset=20&limit=10</code>) — simple but slow for large datasets (DB skips rows). <em>Cursor-based</em> (<code>?cursor=abc123&limit=10</code>) — performant, stable with inserts/deletes, preferred for production.<br><br><strong>Response format:</strong> Always return consistent JSON structure with <code>data</code>, <code>error</code>, <code>pagination</code> fields. Set <code>Content-Type: application/json</code>.",
     "interview": "'REST vs RPC?' — REST: resource-oriented, stateless, HTTP methods. RPC: action-oriented (gRPC, JSON-RPC). 'Idempotency?' — GET/PUT/DELETE idempotent. POST not idempotent. 'PUT vs PATCH?' — PUT: full replace. PATCH: partial update. 'Pagination?' — Offset/limit (simple, slow at scale) vs cursor-based (performant, stable). 'Status codes?' — 200/201/204/400/401/403/404/409/422/429/500/503.",
     "examples": [
      {
       "label": "RESTful handler pattern",
       "lang": "go",
       "code": "// Go 1.22+ ServeMux: method + wildcard patterns, automatic 405\nmux := http.NewServeMux()\nmux.HandleFunc(\"GET /users\", listUsers)\nmux.HandleFunc(\"POST /users\", createUser)\nmux.HandleFunc(\"GET /users/{id}\", getUser)\n\nfunc createUser(w http.ResponseWriter, r *http.Request) {\n    r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // cap body at 1 MiB\n    var u User\n    if err := json.NewDecoder(r.Body).Decode(&u); err != nil {\n        http.Error(w, \"invalid JSON\", http.StatusBadRequest)\n        return\n    }\n    if u.Name == \"\" {\n        http.Error(w, \"name is required\", http.StatusUnprocessableEntity)\n        return\n    }\n    id := saveUser(r.Context(), u)\n    w.Header().Set(\"Content-Type\", \"application/json\")\n    w.Header().Set(\"Location\", fmt.Sprintf(\"/users/%d\", id))\n    w.WriteHeader(http.StatusCreated) // set headers BEFORE WriteHeader\n    json.NewEncoder(w).Encode(map[string]int{\"id\": id})\n}\n\nfunc getUser(w http.ResponseWriter, r *http.Request) {\n    id, err := strconv.Atoi(r.PathValue(\"id\"))\n    if err != nil {\n        http.Error(w, \"bad id\", http.StatusBadRequest)\n        return\n    }\n    u, ok := findUser(r.Context(), id)\n    if !ok {\n        http.NotFound(w, r)\n        return\n    }\n    w.Header().Set(\"Content-Type\", \"application/json\")\n    json.NewEncoder(w).Encode(u)\n}"
      }
     ]
    },
    {
     "title": "API versioning",
     "def": "API versioning ensures <strong>backward compatibility</strong> when evolving an API without breaking existing clients. There are three main strategies:<br><br><strong>1. URL path versioning</strong> (<code>/v1/users</code>, <code>/v2/users</code>): The most common approach. Clear, self-documenting, easy to route, cache-friendly. Each version has its own route group. This is the industry standard used by Google, Stripe, GitHub, and most Go APIs.<br><br><strong>2. Header versioning</strong> (<code>Accept: application/vnd.api.v2+json</code> or custom header <code>X-API-Version: 2</code>): Keeps URLs clean but harder to test (need to set headers manually), harder to cache, and not visible in browser. Used by GitHub's API alongside URL versioning.<br><br><strong>3. Query parameter versioning</strong> (<code>?version=2</code>): Simple but pollutes the query string and is less conventional. Rarely recommended for production APIs.<br><br><strong>When to version:</strong> Only create a new version for <strong>breaking changes</strong>: removing fields, renaming fields, changing types, changing behavior. <strong>Additive changes are NOT breaking:</strong> adding new fields, adding new endpoints, adding optional parameters. Use <code>omitempty</code> in JSON tags to support new optional fields without breaking old clients.<br><br><strong>Best practices:</strong><br>• Support at most 2-3 active versions simultaneously<br>• Deprecation notices in response headers (<code>Sunset</code> header)<br>• Document migration guides between versions<br>• Set a sunset date and communicate it early<br>• v0 for internal/unstable APIs, v1 for first stable release",
     "interview": "'Which versioning strategy?' — URL path (/v1/users) is industry standard. Header for REST purists. 'When to create new version?' — Breaking changes only: removing/renaming fields, changing types. 'What is NOT breaking?' — Adding new fields, new endpoints, optional params. 'Sunset strategy?' — Support 2-3 versions, set deprecation dates, use Sunset header.",
     "examples": [
      {
       "label": "URL-based versioning",
       "lang": "go",
       "code": "mux := http.NewServeMux()\n\n// v1 routes\nmux.HandleFunc(\"/v1/users\", v1UsersHandler)\nmux.HandleFunc(\"/v1/products\", v1ProductsHandler)\n\n// v2 routes (enhanced)\nmux.HandleFunc(\"/v2/users\", v2UsersHandler)\n\n// Version middleware (unexported key type: never use a bare string key)\ntype versionKey struct{}\n\nfunc apiVersion(next http.Handler, version string) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        ctx := context.WithValue(r.Context(), versionKey{}, version)\n        next.ServeHTTP(w, r.WithContext(ctx))\n    })\n}"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "REST CRUD",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-hashmap/",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Logging middleware",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/logs-logs-logs"
    },
    {
     "t": "JWT auth",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "API gateway",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Rate limiter",
     "type": "coding",
     "url": "https://leetcode.com/problems/logger-rate-limiter/"
    },
    {
     "t": "CORS middleware",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Validation",
     "type": "coding",
     "url": "https://leetcode.com/problems/valid-parentheses/",
     "ex": "https://exercism.org/tracks/go/exercises/luhn"
    },
    {
     "t": "Circuit breaker MW",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/error-handling"
    },
    {
     "t": "Timeout MW",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Metrics MW",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "HTTP server",
     "type": "coding",
     "id": "w7_acode_0",
     "solution": "http.HandleFunc(\"/\", func(w http.ResponseWriter, r *http.Request) {\n    fmt.Fprintf(w, \"Hello!\")\n})\nhttp.ListenAndServe(\":8080\", nil)",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "JSON API",
     "type": "coding",
     "id": "w7_acode_1",
     "solution": "func getUser(w http.ResponseWriter, r *http.Request) {\n    w.Header().Set(\"Content-Type\", \"application/json\")\n    json.NewEncoder(w).Encode(User{1, \"John\"})\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/booking-up-for-beauty"
    },
    {
     "t": "Auth MW",
     "type": "coding",
     "id": "w7_acode_2",
     "solution": "func auth(next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        if r.Header.Get(\"Authorization\")==\"\" { http.Error(w,\"unauth\",401); return }\n        next.ServeHTTP(w, r)\n    })\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "HTTP client",
     "type": "coding",
     "id": "w7_acode_3",
     "solution": "client := &http.Client{Timeout: 10 * time.Second}\nresp, err := client.Get(url)\nif err != nil {\n    return err // resp is nil here: check before defer\n}\ndefer resp.Body.Close()",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "CORS MW",
     "type": "coding",
     "id": "w7_acode_4",
     "solution": "func cors(next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        w.Header().Set(\"Access-Control-Allow-Origin\", \"*\")\n        if r.Method==\"OPTIONS\" { w.WriteHeader(200); return }\n        next.ServeHTTP(w, r)\n    })\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/gross-store"
    },
    {
     "t": "Serialize/deserialize",
     "type": "coding",
     "id": "w7_acode_5",
     "solution": "type Item struct { Name string `json:\"name\"` }\nb, _ := json.Marshal(Item{Name:\"x\"})\nvar i Item\n_ = json.Unmarshal(b, &i)",
     "lang": "go"
    }
   ],
   "interviewFocus": [
    {
     "q": "How do HTTP handlers use context, and why is it important?",
     "a": "Every HTTP request carries a <code>context.Context</code> via <code>r.Context()</code>. This context is cancelled when the client disconnects or the server shuts down. Handlers should pass this context to all downstream calls: service methods, database queries (<code>db.QueryContext(ctx, ...)</code>), HTTP client requests (<code>http.NewRequestWithContext(ctx, ...)</code>). This ensures that when a client cancels a request, all in-flight work (DB queries, API calls) is also cancelled — preventing wasted resources. Always accept <code>context.Context</code> as the first parameter in service/repository methods."
    },
    {
     "q": "Explain middleware chaining order and how it affects request processing.",
     "a": "Middleware wraps handlers: <code>func(http.Handler) http.Handler</code>. The <strong>last applied middleware runs first</strong> (outermost layer). For <code>handler = auth(logging(cors(baseHandler)))</code>, <code>auth</code> is the outermost wrapper, so on the way in the order is auth → logging → cors → handler, and the \"after\" code unwinds in reverse: cors → logging → auth. The function you call last when building the chain is the first to run. In this particular chain CORS runs after auth, so a preflight <code>OPTIONS</code> request without credentials would be rejected; it should be <code>cors(auth(logging(base)))</code>. This matters for: (1) CORS must be outermost to handle preflight. (2) Auth must run before business logic. (3) Logging should wrap everything to capture timing. (4) Recovery middleware should be outermost to catch panics from any layer."
    },
    {
     "q": "What are the key principles of RESTful API design in Go?",
     "a": "<strong>Resource-oriented URLs</strong>: nouns not verbs (<code>/users</code> not <code>/getUsers</code>). <strong>HTTP methods</strong>: GET (read), POST (create), PUT (full update), PATCH (partial), DELETE (remove). <strong>Status codes</strong>: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Server Error. <strong>Idempotency</strong>: GET, PUT, DELETE are idempotent; POST is not. <strong>Pagination</strong>: cursor-based for large datasets, offset/limit for simple cases. <strong>Versioning</strong>: URL path (<code>/v1/</code>) is most common."
    },
    {
     "q": "How do you optimize JSON performance in high-throughput Go APIs?",
     "a": "(1) Use <code>json.NewEncoder(w).Encode()</code> instead of <code>json.Marshal()</code> — streams directly to writer, avoiding intermediate byte slice allocation. (2) Use <code>json.NewDecoder(r.Body).Decode()</code> for request parsing — streams from reader. (3) For hot paths, measure first, then consider code generation (<strong>easyjson</strong>), faster libraries (<strong>goccy/go-json</strong>, <strong>bytedance/sonic</strong>), or <code>encoding/json/v2</code> (a GOEXPERIMENT in Go 1.25–1.26 and the default in 1.27), whose decoder is substantially faster than v1. The often-cited jsoniter is no longer actively maintained. (4) Use <code>json.RawMessage</code> to delay parsing of nested structures. (5) Add <code>omitempty</code> to reduce payload size. (6) Pool <code>bytes.Buffer</code> with <code>sync.Pool</code> for encoding."
    },
    {
     "q": "Compare JSON, XML, gob, Protobuf, and binary encoding in Go. When would you choose each?",
     "a": "JSON: human-readable web APIs. XML: enterprise/SOAP interop. Gob: Go-only, self-describing, fast. Protobuf: cross-language binary, schema-driven, best for microservices/gRPC. Binary (encoding/binary): low-level fixed-size primitive control for protocols."
    }
   ],
   "quiz": [
    {
     "q": "Handler?",
     "a": "func(w http.ResponseWriter, r *http.Request)"
    },
    {
     "q": "Start server?",
     "a": "http.ListenAndServe(\":8080\", h)"
    },
    {
     "q": "Middleware?",
     "a": "func(http.Handler) http.Handler"
    },
    {
     "q": "Read body?",
     "a": "json.NewDecoder(r.Body).Decode(&v)"
    },
    {
     "q": "Status codes?",
     "a": "200, 201, 400, 401, 404, 500"
    },
    {
     "q": "JSON tags?",
     "a": "json:\"name,omitempty\""
    },
    {
     "q": "Streaming?",
     "a": "json.NewEncoder(w).Encode()"
    },
    {
     "q": "REST?",
     "a": "GET/POST/PUT/DELETE on resources"
    },
    {
     "q": "CORS?",
     "a": "Cross-Origin Resource Sharing"
    },
    {
     "q": "Context in handlers?",
     "a": "r.Context() for cancellation"
    },
    {
     "q": "JSON vs Protobuf?",
     "a": "JSON is text, schemaless, slower; Protobuf is binary, schema-driven, faster, cross-language."
    },
    {
     "q": "Does net/http ever retry a request by itself?",
     "a": "Yes, narrowly: Transport re-sends a replayable request (idempotent method or Idempotency-Key header, rewindable body) if a reused connection fails before any response bytes arrive."
    },
    {
     "q": "Default MaxIdleConnsPerHost?",
     "a": "2. Raise it for clients making many concurrent calls to one host."
    },
    {
     "q": "How do you read {id} from a Go 1.22 route pattern?",
     "a": "r.PathValue(\"id\")."
    },
    {
     "q": "omitzero vs omitempty?",
     "a": "omitzero (Go 1.24) omits zero values including zero structs and time.Time{} (or via IsZero); omitempty never omits structs."
    }
   ],
   "resources": [
    {
     "title": "REST API with Go Fiber",
     "url": "https://www.youtube.com/watch?v=7q6q9tLwXeU",
     "type": "video"
    },
    {
     "title": "Go REST API",
     "url": "https://www.youtube.com/watch?v=6iW8mQjL5IY",
     "type": "video"
    },
    {
     "title": "Go Blog — Routing Enhancements for Go 1.22",
     "url": "https://go.dev/blog/routing-enhancements",
     "type": "article"
    },
    {
     "title": "Go package net/http",
     "url": "https://pkg.go.dev/net/http",
     "type": "docs"
    },
    {
     "title": "Go package encoding/json",
     "url": "https://pkg.go.dev/encoding/json",
     "type": "docs"
    }
   ]
  },
  {
   "n": 8,
   "title": "Database & Transactions",
   "group": "Core Go (Weeks 1–8)",
   "topics": [
    {
     "title": "database/sql, connections, pooling",
     "def": "The <code>database/sql</code> package provides a <strong>generic, driver-agnostic SQL interface</strong> with built-in <strong>connection pooling</strong>. It is Go's standard for database access — you write code against <code>database/sql</code>, and a driver (e.g., <code>github.com/jackc/pgx/v5/stdlib</code> for PostgreSQL, <code>go-sql-driver/mysql</code>) handles the protocol specifics. <code>lib/pq</code> is in maintenance mode, so new PostgreSQL code usually uses pgx, either through <code>database/sql</code> or through its native <code>pgxpool</code> API, which is faster and supports COPY, batching and LISTEN/NOTIFY.<br><br><strong>Connection pool mechanics:</strong><br>• <code>sql.Open(driver, dsn)</code> creates the pool — it does <strong>not</strong> establish a connection. Use <code>db.Ping()</code> or <code>db.PingContext(ctx)</code> to verify connectivity.<br>• <code>SetMaxOpenConns(n)</code> — maximum number of open connections (default: unlimited). Set this to prevent overwhelming the database.<br>• <code>SetMaxIdleConns(n)</code> — maximum idle connections in the pool (default: 2). Idle connections avoid the cost of re-establishing TCP connections.<br>• <code>SetConnMaxLifetime(d)</code> — maximum time a connection can be reused. Prevents using stale connections (especially behind load balancers that rotate backends).<br><br><strong>Critical rules:</strong><br>• <strong>Always parameterize queries</strong> — <code>db.Query(\"SELECT * FROM users WHERE id=$1\", id)</code> — never use <code>fmt.Sprintf</code> (SQL injection).<br>• <strong>Always close resources</strong>: <code>defer rows.Close()</code> after <code>db.Query()</code>, <code>defer resp.Body.Close()</code>. Forgetting to close <code>rows</code> leaks connections from the pool, eventually exhausting it.<br>• <strong>Use context variants</strong>: <code>db.QueryContext(ctx, ...)</code>, <code>db.ExecContext(ctx, ...)</code> to support cancellation and timeouts.<br>• <code>sql.NullString</code>, <code>sql.NullInt64</code> etc. handle nullable database columns.",
     "interview": "'sql.Open connects immediately?' — No, it creates a pool. Use Ping() to verify. 'Pool sizing rule?' — DB max connections / number of app instances. 'Resource leak?' — Always defer rows.Close(). Unclosed rows exhaust the pool. 'Context in queries?' — Always use QueryContext/ExecContext for cancellation support. 'SQL injection prevention?' — Always parameterized queries, never fmt.Sprintf.",
     "examples": [
      {
       "label": "Production pool setup",
       "lang": "go",
       "code": "db, err := sql.Open(\"pgx\", dsn) // import _ \"github.com/jackc/pgx/v5/stdlib\"\nif err != nil { log.Fatal(err) }\ndefer db.Close()\n\n// Pool configuration\ndb.SetMaxOpenConns(25)                  // max total connections\ndb.SetMaxIdleConns(5)                   // max idle connections\ndb.SetConnMaxLifetime(5 * time.Minute)  // prevent stale connections\ndb.SetConnMaxIdleTime(1 * time.Minute)  // recycle idle connections\n\n// Verify connection\nctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)\ndefer cancel()\nif err := db.PingContext(ctx); err != nil {\n    log.Fatal(\"db unreachable:\", err)\n}\n\n// Monitor pool health\nstats := db.Stats()\nlog.Printf(\"Open: %d, InUse: %d, Idle: %d\",\n    stats.OpenConnections, stats.InUse, stats.Idle)"
      },
      {
       "label": "CRUD with context",
       "lang": "go",
       "code": "// Query single row\nvar user User\nerr := db.QueryRowContext(ctx,\n    \"SELECT id, name, email FROM users WHERE id = $1\", id,\n).Scan(&user.ID, &user.Name, &user.Email)\nif errors.Is(err, sql.ErrNoRows) {\n    return nil, ErrNotFound\n}\nif err != nil {\n    return nil, err\n}\n\n// Query multiple rows — MUST close!\nrows, err := db.QueryContext(ctx,\n    \"SELECT id, name FROM users WHERE active = $1\", true)\nif err != nil { return nil, err }\ndefer rows.Close()  // CRITICAL: prevents connection leak\n\nvar users []User\nfor rows.Next() {\n    var u User\n    if err := rows.Scan(&u.ID, &u.Name); err != nil {\n        return nil, err\n    }\n    users = append(users, u)\n}\nreturn users, rows.Err()  // check for iteration errors"
      }
     ]
    },
    {
     "title": "ORM: GORM, sqlx",
     "def": "Go offers two primary approaches for database interaction beyond raw <code>database/sql</code>:<br><br><strong>GORM</strong> (<code>gorm.io/gorm</code>): Go's most popular <strong>full-featured ORM</strong>. Provides: auto-migrations (<code>db.AutoMigrate(&User{})</code>), CRUD helpers (<code>db.Create</code>, <code>db.First</code>, <code>db.Find</code>, <code>db.Update</code>, <code>db.Delete</code>), associations (HasMany, BelongsTo, ManyToMany with Preload), hooks (BeforeCreate, AfterSave), scopes (reusable query fragments), and soft delete (paranoid delete with DeletedAt field). GORM uses struct tags: <code>gorm:\"not null;uniqueIndex\"</code>.<br><br><strong>GORM pitfalls:</strong> (1) <strong>N+1 problem</strong> — accessing associations without <code>Preload</code> triggers lazy queries. Always use <code>db.Preload(\"Posts\").Find(&users)</code>. (2) <strong>Hidden queries</strong> — GORM generates SQL behind the scenes; enable <code>Debug()</code> mode to see actual queries. (3) <strong>Auto-migration limitations</strong> — doesn't handle column drops, renames, or complex constraints. Use a dedicated migration tool for production.<br><br><strong>sqlx</strong> (<code>github.com/jmoiron/sqlx</code>): A <strong>lightweight extension</strong> of <code>database/sql</code> that adds convenience without hiding SQL. Key features: <code>StructScan</code> (scan rows into structs using <code>db</code> tags), <code>Select</code> (query + scan in one call), <code>NamedExec</code>/<code>NamedQuery</code> (use struct field names as query params), <code>In()</code> for WHERE IN queries. You write real SQL — sqlx just reduces the boilerplate of scanning.<br><br><strong>When to choose which:</strong> GORM for rapid development, CRUD-heavy apps, prototyping. sqlx for complex queries, reporting, performance-critical paths. <strong>Hybrid approach</strong>: GORM for simple CRUD, raw SQL via <code>db.Raw()</code> or sqlx for complex reports. Many production Go services use sqlx exclusively for full SQL control.<br><br><strong>sqlc</strong> (sqlc.dev) is the third popular option. You write plain SQL queries in <code>.sql</code> files, and sqlc generates type-safe Go functions and structs from them, checked against your schema at build time. You keep full SQL control, avoid reflection, and catch broken queries in CI. It supports both pgx and database/sql.",
     "interview": "'ORM vs raw SQL?' — ORM: productivity for CRUD. Raw SQL: complex queries, performance. Hybrid is common. 'GORM N+1?' — Use Preload for associations. Enable Debug() to see generated SQL. 'sqlx vs database/sql?' — sqlx adds StructScan, Select, NamedExec. Still write real SQL. 'Auto-migration in production?' — No. Use golang-migrate or goose for production migrations. 'sqlc?' — Generates type-safe Go from hand-written SQL plus the schema: compile-time checked queries without an ORM.",
     "examples": [
      {
       "label": "GORM basics",
       "lang": "go",
       "code": "type User struct {\n    gorm.Model\n    Name  string `gorm:\"not null\"`\n    Email string `gorm:\"uniqueIndex\"`\n    Posts []Post\n}\n\n// Auto migrate\ndb.AutoMigrate(&User{})\n\n// CRUD\ndb.Create(&User{Name: \"John\"})\ndb.First(&user, 1)\ndb.Where(\"name = ?\", \"John\").Find(&users)\ndb.Model(&user).Update(\"Name\", \"Jane\")\n\n// Preload (avoid N+1)\ndb.Preload(\"Posts\").Find(&users)"
      },
      {
       "label": "sqlx",
       "lang": "go",
       "code": "type User struct {\n    ID   int    `db:\"id\"`\n    Name string `db:\"name\"`\n}\n\ndb := sqlx.MustConnect(\"postgres\", dsn)\n\n// Struct scanning\nvar users []User\ndb.Select(&users, \"SELECT * FROM users WHERE age > $1\", 18)\n\n// Named queries\ndb.NamedExec(\"INSERT INTO users (name) VALUES (:name)\", user)"
      }
     ]
    },
    {
     "title": "Transactions: begin, commit, rollback",
     "def": "Database <strong>transactions</strong> ensure <strong>ACID</strong> properties: <strong>Atomicity</strong> (all operations succeed or all rollback), <strong>Consistency</strong> (database moves between valid states), <strong>Isolation</strong> (concurrent transactions don't interfere), <strong>Durability</strong> (committed data survives crashes).<br><br><strong>Go transaction pattern:</strong> <code>tx, err := db.Begin()</code> starts a transaction. Execute queries with <code>tx.Exec()</code> / <code>tx.Query()</code> (not <code>db</code>!). Finish with <code>tx.Commit()</code> or <code>tx.Rollback()</code>. <strong>Always <code>defer tx.Rollback()</code></strong> — it's a no-op after Commit(), but guarantees cleanup on error or panic.<br><br><strong>Context-aware transactions:</strong> <code>db.BeginTx(ctx, &sql.TxOptions{})</code> ties the transaction to a context. If the context is cancelled, the transaction is rolled back automatically. Use <code>sql.TxOptions{Isolation: sql.LevelSerializable}</code> to set isolation level, <code>ReadOnly: true</code> for read-only transactions (optimizer hint).<br><br><strong>Isolation levels (critical for interviews):</strong><br>• <strong>Read Uncommitted:</strong> sees uncommitted changes (dirty reads). Almost never used.<br>• <strong>Read Committed</strong> (PostgreSQL default): only sees committed data. Good for most OLTP workloads.<br>• <strong>Repeatable Read</strong> (MySQL default): consistent snapshot within transaction. Prevents non-repeatable reads.<br>• <strong>Serializable:</strong> strictest — transactions execute as if sequential. Use for financial operations, inventory management. Higher isolation = more locking = lower throughput.<br><br><strong>Deadlock handling:</strong> Deadlocks occur when two transactions wait for each other's locks. Databases detect and abort one transaction. In Go: catch the deadlock error and retry the <em>whole transaction</em> with exponential backoff (typically 3-5 retries). The same applies to PostgreSQL <code>SERIALIZABLE</code>/<code>REPEATABLE READ</code> serialization failures (SQLSTATE <code>40001</code>, deadlocks are <code>40P01</code>). Inspect them with <code>errors.As(err, &amp;pgErr)</code> on a <code>*pgconn.PgError</code>.<br><br><strong>Common mistake:</strong> Mixing <code>tx.Exec()</code> with <code>db.Exec()</code> within the same logical transaction — the <code>db</code> call runs outside the transaction.",
     "interview": "'ACID?' — Atomicity, Consistency, Isolation, Durability. 'Safe transaction pattern?' — Begin, defer Rollback, operations, Commit. Rollback is no-op after Commit. 'Isolation levels?' — Read Uncommitted, Read Committed (PG default), Repeatable Read (MySQL default), Serializable. 'Deadlocks?' — Two transactions waiting for each other. Retry with exponential backoff. 'Common mistake?' — Using db.Exec() instead of tx.Exec() inside transaction.",
     "examples": [
      {
       "label": "Safe transaction pattern",
       "lang": "go",
       "code": "func transfer(ctx context.Context, db *sql.DB, from, to int, amount int64) error {\n    tx, err := db.BeginTx(ctx, nil)\n    if err != nil {\n        return err\n    }\n    defer tx.Rollback() // no-op (ErrTxDone) after a successful Commit\n\n    if _, err := tx.ExecContext(ctx,\n        \"UPDATE accounts SET bal = bal - $1 WHERE id = $2\", amount, from); err != nil {\n        return err\n    }\n    if _, err := tx.ExecContext(ctx,\n        \"UPDATE accounts SET bal = bal + $1 WHERE id = $2\", amount, to); err != nil {\n        return err\n    }\n    return tx.Commit()\n}\n// Money as integer cents (int64), never float64."
      },
      {
       "label": "Transaction with isolation",
       "lang": "go",
       "code": "tx, err := db.BeginTx(ctx, &sql.TxOptions{\n    Isolation: sql.LevelSerializable,\n    ReadOnly:  false,\n})\nif err != nil {\n    return err // check before deferring Rollback on a nil tx\n}\ndefer tx.Rollback()"
      }
     ]
    },
    {
     "title": "Optimization: indexes, N+1",
     "def": "Database performance optimization is critical for production Go services. Two major areas:<br><br><strong>Indexes:</strong> Data structures that speed up queries by avoiding full table scans. Types:<br>• <strong>B-tree</strong> (default) — supports equality, range, and ordering queries. Used for most columns.<br>• <strong>Hash</strong> — only equality lookups, faster than B-tree for exact matches.<br>• <strong>GIN</strong> — Generalized Inverted Index. For full-text search, JSONB fields, array columns.<br>• <strong>GiST</strong> — for geometric data, range types, proximity queries.<br><br><strong>When to index:</strong> columns in WHERE clauses, JOIN conditions, ORDER BY, GROUP BY, and foreign keys. <strong>Tradeoffs:</strong> indexes speed up reads but slow down writes (each INSERT/UPDATE must update the index). They also consume storage.<br><br><strong>Composite indexes:</strong> Multi-column indexes follow the <strong>leftmost prefix rule</strong> — an index on <code>(user_id, created_at)</code> can be used for queries on <code>user_id</code> alone or <code>user_id + created_at</code>, but NOT <code>created_at</code> alone. Column order matters!<br><br><strong>N+1 Problem:</strong> The most common performance anti-pattern in applications using databases. It occurs when code executes 1 query to fetch a list, then N additional queries to fetch related data for each item. Example: fetch 100 orders, then fetch the user for each order = 101 queries instead of 1 JOIN. <strong>Fixes:</strong> (1) SQL JOIN, (2) subquery/IN clause, (3) GORM <code>Preload</code>, (4) batch loading (DataLoader pattern).<br><br><strong>Diagnosing slow queries:</strong> <code>EXPLAIN ANALYZE</code> shows the query execution plan — reveals sequential scans (missing index), join strategies, and actual vs estimated row counts. In Go, log all queries above a threshold or use middleware to track query counts per request.",
     "interview": "'N+1 problem?' — 1 query for list + N for relations. Fix with JOINs, Preload, or batch loading. 'How to detect?' — Query logging, EXPLAIN ANALYZE, request-level query counting. 'Index tradeoffs?' — Faster reads, slower writes, more storage. 'Composite index order?' — Leftmost prefix rule. (a,b) works for a or a+b, not b alone. 'EXPLAIN ANALYZE?' — Shows query plan, reveals missing indexes, sequential scans.",
     "examples": [
      {
       "label": "Query optimization",
       "lang": "go",
       "code": "// N+1 problem\nrows, _ := db.Query(\"SELECT id FROM orders\")\nfor rows.Next() {\n    var id int\n    rows.Scan(&id)\n    db.QueryRow(\"SELECT name FROM users WHERE id=$1\", id) // N queries!\n}\n\n// Fixed with JOIN\ndb.Query(`SELECT o.id, u.name \n          FROM orders o \n          JOIN users u ON o.user_id = u.id`)\n\n// Index\n// CREATE INDEX idx_users_email ON users(email);\n// CREATE INDEX idx_orders_user ON orders(user_id, created_at);"
      }
     ]
    },
    {
     "title": "Migrations",
     "def": "Database migrations are <strong>version-controlled schema changes</strong> that keep the database structure in sync with application code. They are essential for team collaboration, CI/CD pipelines, and reproducible deployments.<br><br><strong>Popular Go migration tools:</strong><br>• <strong>golang-migrate</strong> (<code>github.com/golang-migrate/migrate</code>) — language-agnostic, supports many databases, used from CLI or Go code. SQL-based migrations.<br>• <strong>goose</strong> (<code>github.com/pressly/goose</code>) — supports SQL and Go-based migrations (for complex data transformations). Embeddable in Go apps.<br>• <strong>atlas</strong> (<code>ariga.io/atlas</code>) — declarative schema management. Define desired state, atlas generates migration. Modern approach.<br><br><strong>Migration structure:</strong> Each migration has an <code>up</code> (apply change) and <code>down</code> (rollback change) file. Migrations are numbered or timestamped to ensure ordering. The migration tool tracks which migrations have been applied in a metadata table (e.g., <code>schema_migrations</code>).<br><br><strong>Critical rules:</strong><br>• <strong>Never edit applied migrations</strong> — create new ones. Editing an applied migration breaks other environments.<br>• <strong>Test rollbacks</strong> — ensure <code>down</code> migrations actually work before deploying.<br>• <strong>Separate schema from data migrations</strong> — schema changes in migration files, data transformations in application code (where you have business logic and error handling).<br>• <strong>CI/CD integration</strong> — run migrations before deploying new application code. Use advisory locks to prevent concurrent migration execution.<br>• <strong>Zero-downtime migrations</strong> — for production: add new columns as nullable first, backfill data, then add constraints. Never drop columns in the same deploy that stops writing to them.",
     "interview": "'Migration strategy?' — Forward-only in production. Test rollbacks. Never edit applied migrations. 'Schema vs data migration?' — Separate: schema in SQL files, data in application code. 'Zero-downtime migrations?' — Add nullable column, backfill, add constraint. Never drop column in same deploy. 'CI/CD integration?' — Run migrations before deploy. Use advisory locks for safety. 'golang-migrate vs goose?' — golang-migrate: SQL-only, language-agnostic. goose: SQL + Go migrations.",
     "examples": [
      {
       "label": "golang-migrate",
       "lang": "go",
       "code": "// File: 001_create_users.up.sql\nCREATE TABLE users (\n    id SERIAL PRIMARY KEY,\n    name VARCHAR(255) NOT NULL,\n    email VARCHAR(255) UNIQUE NOT NULL,\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\n// File: 001_create_users.down.sql\nDROP TABLE IF EXISTS users;\n\n// Run from Go\nm, _ := migrate.New(\"file://migrations\", dbURL)\nm.Up()   // apply all\nm.Down() // rollback all"
      },
      {
       "label": "goose",
       "lang": "go",
       "code": "// File: 20240101_add_posts.sql\n-- +goose Up\nCREATE TABLE posts (\n    id SERIAL PRIMARY KEY,\n    user_id INT REFERENCES users(id),\n    title TEXT NOT NULL\n);\n\n-- +goose Down\nDROP TABLE posts;"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Connection pool",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-hashmap/"
    },
    {
     "t": "Transaction repo",
     "type": "coding",
     "solution": "tx, err := db.BeginTx(ctx, nil)\nif err != nil {\n    return err\n}\ndefer tx.Rollback()\nif _, err := tx.ExecContext(ctx, \"UPDATE x SET v=$1 WHERE id=$2\", v, id); err != nil {\n    return err\n}\nreturn tx.Commit()",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Query builder",
     "type": "coding",
     "solution": "var u User\nerr := db.QueryRowContext(ctx, \"SELECT id, name FROM users WHERE id=$1\", id).Scan(&u.ID, &u.Name)\nif errors.Is(err, sql.ErrNoRows) {\n    return nil, ErrNotFound\n}\nif err != nil {\n    return nil, err\n}\nreturn &u, nil",
     "lang": "go",
     "url": "https://leetcode.com/problems/combine-two-tables/"
    },
    {
     "t": "Migrations",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Health checker",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/error-handling"
    },
    {
     "t": "DB cache TTL",
     "type": "coding",
     "url": "https://leetcode.com/problems/lru-cache/"
    },
    {
     "t": "Session store",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-hashmap/"
    },
    {
     "t": "Sharding",
     "type": "coding",
     "url": "https://leetcode.com/problems/design-hashmap/"
    },
    {
     "t": "Read replica",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Tx retry",
     "type": "coding",
     "ex": "https://exercism.org/tracks/go/exercises/error-handling"
    },
    {
     "t": "DB connection",
     "type": "coding",
     "id": "w8_acode_0",
     "solution": "db, err := sql.Open(\"pgx\", dsn)\nif err != nil {\n    return nil, err\n}\ndb.SetMaxOpenConns(25)\nif err := db.PingContext(ctx); err != nil {\n    db.Close()\n    return nil, err\n}\nreturn db, nil",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Repository",
     "type": "coding",
     "id": "w8_acode_3",
     "solution": "type Repo struct{ db *sql.DB }\n\nfunc (r *Repo) WithTx(ctx context.Context, fn func(*sql.Tx) error) error {\n    tx, err := r.db.BeginTx(ctx, nil)\n    if err != nil {\n        return err\n    }\n    defer tx.Rollback()\n    if err := fn(tx); err != nil {\n        return err\n    }\n    return tx.Commit()\n}",
     "lang": "go",
     "ex": "https://exercism.org/tracks/go/exercises/bank-account"
    },
    {
     "t": "Batch insert",
     "type": "coding",
     "id": "w8_acode_4",
     "solution": "tx, err := db.BeginTx(ctx, nil)\nif err != nil {\n    return err\n}\ndefer tx.Rollback()\nstmt, err := tx.PrepareContext(ctx, \"INSERT INTO users (name) VALUES ($1)\")\nif err != nil {\n    return err\n}\ndefer stmt.Close()\nfor _, u := range users {\n    if _, err := stmt.ExecContext(ctx, u.Name); err != nil {\n        return err\n    }\n}\nreturn tx.Commit()\n// For large batches prefer multi-row INSERT or pgx CopyFrom.",
     "lang": "go",
     "url": "https://leetcode.com/problems/design-hashmap/"
    }
   ],
   "interviewFocus": [
    {
     "q": "How do you size a database connection pool in Go?",
     "a": "Connection pool sizing depends on: (1) <strong>Database max connections</strong> divided by number of app instances. (2) <strong>Query duration</strong> — short queries need fewer connections. (3) Rule of thumb: <code>SetMaxOpenConns(25)</code>, <code>SetMaxIdleConns(5)</code>, <code>SetConnMaxLifetime(5*time.Minute)</code>. Too many connections waste DB resources; too few cause request queuing. Monitor with <code>db.Stats()</code>. For microservices: if DB allows 100 connections and you have 4 instances, set max to 25 each. Always test under load to find the sweet spot."
    },
    {
     "q": "Explain database isolation levels and when to use each.",
     "a": "<strong>Read Uncommitted</strong>: sees uncommitted changes (dirty reads) — almost never used. <strong>Read Committed</strong> (PostgreSQL default): only sees committed data — good for most OLTP. <strong>Repeatable Read</strong> (MySQL default): consistent snapshot within transaction — prevents non-repeatable reads. <strong>Serializable</strong>: strictest, transactions execute as if sequential — use for financial transactions, inventory. Trade-off: higher isolation = more locking = lower throughput. In Go: <code>db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})</code>."
    },
    {
     "q": "How does Go prevent SQL injection?",
     "a": "<strong>Always use parameterized queries</strong>: <code>db.Query(\"SELECT * FROM users WHERE id=$1\", id)</code>. The <code>$1</code> (PostgreSQL) or <code>?</code> (MySQL) placeholders ensure the database driver properly escapes input. <strong>Never</strong> use <code>fmt.Sprintf</code> to build SQL strings — this allows injection. For dynamic queries (varying WHERE clauses, ORDER BY), use query builders like <code>squirrel</code> or <code>sqlx</code> named queries. The <code>database/sql</code> package also supports prepared statements via <code>db.Prepare()</code> which are pre-compiled and inherently safe."
    },
    {
     "q": "ORM vs raw SQL — when to choose each in Go?",
     "a": "<strong>ORM (GORM)</strong>: choose for rapid development, CRUD-heavy applications, auto-migrations, and when team productivity matters more than query control. Benefits: less boilerplate, automatic association handling, hooks. <strong>Raw SQL (database/sql, sqlx)</strong>: choose for complex queries, performance-critical paths, reporting, and when you need full control. Benefits: predictable queries, no hidden N+1, better for complex JOINs. <strong>Hybrid approach</strong>: use GORM for simple CRUD, raw SQL for complex reports. Always monitor generated queries — GORM's <code>Preload</code> can mask N+1 problems."
    }
   ],
   "quiz": [
    {
     "q": "database/sql?",
     "a": "Standard SQL interface + auto pooling."
    },
    {
     "q": "sql.Open?",
     "a": "Creates pool, doesn't connect."
    },
    {
     "q": "Pooling?",
     "a": "SetMaxOpenConns, SetMaxIdleConns."
    },
    {
     "q": "Query vs QueryRow?",
     "a": "Query: multiple. QueryRow: single."
    },
    {
     "q": "Injection prevention?",
     "a": "Parameterized: $1 or ? placeholders."
    },
    {
     "q": "Transaction?",
     "a": "Begin → Commit/Rollback."
    },
    {
     "q": "N+1?",
     "a": "N+1 queries. Fix: JOIN or batch."
    },
    {
     "q": "ORM vs SQL?",
     "a": "ORM: simple CRUD. SQL: complex, perf."
    },
    {
     "q": "NULL?",
     "a": "sql.NullString or pointer types."
    },
    {
     "q": "Prepared stmt?",
     "a": "Pre-compiled SQL template."
    }
   ],
   "resources": [
    {
     "title": "PostgreSQL with PGX",
     "url": "https://www.youtube.com/watch?v=KXeQ1Qp8t0k",
     "type": "video"
    },
    {
     "title": "Go DB Chapters",
     "url": "https://www.youtube.com/watch?v=un6ZyFkqFKo",
     "type": "video"
    },
    {
     "title": "Go — Accessing relational databases",
     "url": "https://go.dev/doc/database/",
     "type": "docs"
    },
    {
     "title": "Go — Managing connections",
     "url": "https://go.dev/doc/database/manage-connections",
     "type": "docs"
    }
   ]
  },
  {
   "n": 9,
   "title": "Network Programming in Go",
   "group": "Cloud-Native Go (Weeks 9–14)",
   "summary": "Build and debug networked services from the socket up: TCP/UDP with package net, DNS resolution, an L7 reverse proxy / load balancer with httputil.ReverseProxy, and gRPC with Protocol Buffers. These are the building blocks behind every Go microservice, proxy and Kubernetes component — and a favourite area for senior backend interviews.",
   "topics": [
    {
     "title": "TCP Servers & Clients with package net",
     "def": "<strong>package net</strong> exposes stream sockets through two interfaces: <code>net.Listener</code> (<code>Accept</code>, <code>Close</code>, <code>Addr</code>) and <code>net.Conn</code> (an <code>io.Reader</code> + <code>io.Writer</code> with deadlines). The idiomatic server is <strong>goroutine-per-connection</strong>: you write simple blocking code, and the runtime <strong>netpoller</strong> (epoll / kqueue / IOCP) parks the goroutine instead of an OS thread — so 100k idle connections cost 100k small goroutine stacks, not 100k threads. <ul> <li><strong>Deadlines</strong> — <code>SetDeadline</code>, <code>SetReadDeadline</code>, <code>SetWriteDeadline</code> take an <em>absolute</em> <code>time.Time</code>. Re-arm before each read to get an idle timeout. A timed-out call returns an error matching <code>errors.Is(err, os.ErrDeadlineExceeded)</code>. Without deadlines a slow or dead peer pins a goroutine forever (slowloris).</li> <li><strong>Framing</strong> — TCP is a <em>byte stream</em>: one <code>Write</code> may arrive as several <code>Read</code>s, or several writes as one read. Use delimiters (<code>bufio.Scanner</code>, 64 KiB default token limit) or a length prefix (<code>encoding/binary</code> + <code>io.ReadFull</code>), always with a maximum message size.</li> <li><strong>Clients</strong> — use <code>net.Dialer{Timeout, KeepAlive}</code> and <code>DialContext</code>; never dial without a timeout. <code>net.Dial</code> resolves DNS and tries addresses (Happy Eyeballs for dual-stack).</li> <li><strong>Graceful close</strong> — closing the listener makes <code>Accept</code> return <code>net.ErrClosed</code>; <code>(*net.TCPConn).CloseWrite</code> half-closes (sends FIN) so the peer reads EOF while you can still read its reply; always <code>defer conn.Close()</code>.</li> <li><strong>Accept errors</strong> — on errors like EMFILE (too many open files) back off briefly instead of spinning; raise <code>ulimit -n</code> for high-connection servers.</li> </ul>",
     "interview": "Interviewers probe: why goroutine-per-connection scales in Go (netpoller parks goroutines, not threads), how you handle partial reads (framing + io.ReadFull), how you defend against slowloris and memory blow-ups (read deadlines, max message size, connection limits), and how you shut down cleanly (close the listener, signal handlers, wait with a deadline, then force-close).",
     "examples": [
      {
       "label": "Line-based echo server with idle timeout and clean shutdown",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"bufio\"\n    \"context\"\n    \"errors\"\n    \"log\"\n    \"net\"\n    \"os\"\n    \"os/signal\"\n    \"time\"\n)\n\nfunc main() {\n    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)\n    defer stop()\n\n    ln, err := net.Listen(\"tcp\", \":9000\")\n    if err != nil {\n        log.Fatal(err)\n    }\n    go func() { <-ctx.Done(); ln.Close() }() // unblocks Accept\n\n    for {\n        conn, err := ln.Accept()\n        if err != nil {\n            if errors.Is(err, net.ErrClosed) {\n                return\n            }\n            log.Print(\"accept: \", err)\n            time.Sleep(10 * time.Millisecond) // back off on EMFILE etc.\n            continue\n        }\n        go handle(conn)\n    }\n}\n\nfunc handle(c net.Conn) {\n    defer c.Close()\n    sc := bufio.NewScanner(c)\n    sc.Buffer(make([]byte, 4096), 64*1024) // cap the line length\n    for {\n        c.SetReadDeadline(time.Now().Add(30 * time.Second)) // idle timeout\n        if !sc.Scan() {\n            return // EOF, timeout, or line too long (sc.Err())\n        }\n        if _, err := c.Write(append(sc.Bytes(), '\\n')); err != nil {\n            return\n        }\n    }\n}"
      },
      {
       "label": "Client: dial with timeout, half-close, read the full reply",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"context\"\n    \"fmt\"\n    \"io\"\n    \"log\"\n    \"net\"\n    \"time\"\n)\n\nfunc main() {\n    d := net.Dialer{Timeout: 3 * time.Second, KeepAlive: 30 * time.Second}\n    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)\n    defer cancel()\n\n    conn, err := d.DialContext(ctx, \"tcp\", \"localhost:9000\")\n    if err != nil {\n        log.Fatal(err)\n    }\n    defer conn.Close()\n    conn.SetDeadline(time.Now().Add(5 * time.Second)) // bound the whole exchange\n\n    fmt.Fprintln(conn, \"hello\")\n    conn.(*net.TCPConn).CloseWrite() // FIN: \"no more requests\", reads still work\n    reply, err := io.ReadAll(conn)   // until the server closes its side\n    if err != nil {\n        log.Fatal(err)\n    }\n    fmt.Printf(\"%q\\n\", reply)\n}"
      }
     ]
    },
    {
     "title": "UDP: Datagrams, Boundaries and Reliability",
     "def": "<strong>UDP</strong> is connectionless and <em>message-oriented</em>: each <code>WriteTo</code> sends one datagram and each <code>ReadFrom</code> returns at most one — boundaries are preserved, but delivery, ordering and de-duplication are <strong>not</strong>. It powers DNS, QUIC/HTTP/3, StatsD metrics, service discovery and games. <ul> <li><strong>APIs</strong> — <code>net.ListenPacket(\"udp\", \":9001\")</code> returns a <code>net.PacketConn</code>; <code>net.ListenUDP</code> returns <code>*net.UDPConn</code> with allocation-free <code>ReadFromUDPAddrPort</code> / <code>WriteToUDPAddrPort</code> using <code>netip.AddrPort</code>.</li> <li><strong>Truncation</strong> — if your buffer is smaller than the datagram, the excess is silently discarded. Size the buffer for the largest expected message (max UDP payload is 65,507 bytes over IPv4).</li> <li><strong>MTU</strong> — keep payloads around 1,200–1,400 bytes to avoid IP fragmentation; losing one fragment loses the whole datagram.</li> <li><strong>Connected UDP</strong> — <code>net.Dial(\"udp\", addr)</code> fixes the peer, lets you use <code>Read</code>/<code>Write</code>, filters packets from other sources and surfaces ICMP \"port unreachable\" as <code>ECONNREFUSED</code> on the next read.</li> <li><strong>No backpressure</strong> — when the socket receive buffer is full the kernel drops packets; raise it with <code>SetReadBuffer</code> and keep the read loop fast (hand work to a worker pool).</li> <li><strong>Reliability is your job</strong> — timeouts, retries with backoff, request IDs to match replies, and idempotent operations because a lost <em>reply</em> does not mean the request was not processed.</li> </ul>",
     "interview": "Expect \"TCP vs UDP — when would you pick UDP?\" Answer with trade-offs (latency, no head-of-line blocking, multicast, but no reliability/congestion control) and show you know the sharp edges: silent truncation, fragmentation, kernel drops under load, and the need for request IDs + idempotency when retrying. Mentioning that QUIC builds reliability on top of UDP in user space is a plus.",
     "examples": [
      {
       "label": "Allocation-free UDP echo server",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"errors\"\n    \"log\"\n    \"net\"\n)\n\nfunc main() {\n    pc, err := net.ListenUDP(\"udp\", &net.UDPAddr{Port: 9001})\n    if err != nil {\n        log.Fatal(err)\n    }\n    defer pc.Close()\n    pc.SetReadBuffer(4 << 20) // 4 MiB kernel buffer to absorb bursts\n\n    buf := make([]byte, 64*1024) // >= largest datagram, or it is truncated\n    for {\n        n, addr, err := pc.ReadFromUDPAddrPort(buf)\n        if err != nil {\n            if errors.Is(err, net.ErrClosed) {\n                return\n            }\n            log.Print(err)\n            continue\n        }\n        // One datagram in, one datagram out — boundaries are preserved.\n        if _, err := pc.WriteToUDPAddrPort(buf[:n], addr); err != nil {\n            log.Print(err)\n        }\n    }\n}"
      }
     ]
    },
    {
     "title": "DNS Resolution in Go (net.Resolver)",
     "def": "Go ships <strong>two resolvers</strong>. The <strong>pure-Go resolver</strong> reads <code>/etc/resolv.conf</code> and <code>/etc/hosts</code> and speaks DNS itself — a blocked lookup only parks a goroutine. The <strong>cgo resolver</strong> calls libc <code>getaddrinfo</code>, so each in-flight lookup occupies an OS thread (thousands of slow lookups = thousands of threads). <ul> <li><strong>Selection on Linux</strong> — pure Go by default; Go falls back to cgo when it sees configuration it cannot honour (e.g. <code>/etc/nsswitch.conf</code> sources such as mdns/ldap, or <code>LOCALDOMAIN</code>, <code>RES_OPTIONS</code>, <code>HOSTALIASES</code> set). Override with <code>GODEBUG=netdns=go</code> or <code>netdns=cgo</code> (append <code>+1</code> to log the decision) or build tags <code>netgo</code> / <code>netcgo</code>. <code>CGO_ENABLED=0</code> static binaries always use pure Go. macOS and Windows default to the OS resolver.</li> <li><strong>API</strong> — <code>net.DefaultResolver</code> or a custom <code>&amp;net.Resolver{PreferGo: true, Dial: ...}</code> to target a specific DNS server. <code>LookupNetIP(ctx, \"ip4\", host)</code>, <code>LookupHost</code>, <code>LookupTXT</code>, <code>LookupMX</code>, and <code>LookupSRV(ctx, \"grpc\", \"tcp\", \"svc.example.com\")</code> which queries <code>_grpc._tcp.svc.example.com</code> and returns records sorted by priority and randomised by weight.</li> <li><strong>Timeouts</strong> — every lookup takes a <code>context.Context</code>; always bound it. The pure-Go resolver also honours <code>options timeout:/attempts:</code> from resolv.conf.</li> <li><strong>No in-process cache</strong> — Go does not cache DNS answers; every new dial resolves. Rely on a node-local cache (NodeLocal DNSCache, systemd-resolved) or add a small TTL cache. Conversely, pooled keep-alive connections <em>never</em> re-resolve, so DNS-based failover only takes effect when connections are recycled (<code>IdleConnTimeout</code>, max connection age).</li> <li><strong>Kubernetes <code>ndots:5</code></strong> — a name with fewer than 5 dots is first tried against every search domain, multiplying queries; use a trailing-dot FQDN (<code>api.example.com.</code>) or tune <code>dnsConfig</code>.</li> </ul>",
     "interview": "Common probes: \"Why did our Go service spawn thousands of threads?\" (cgo resolver under slow DNS), \"Why didn't traffic move after we changed the DNS record?\" (keep-alive connections and client-side caching never re-resolve), and \"Why is DNS latency high in Kubernetes?\" (ndots:5 search-domain expansion). Know how to force the pure-Go resolver and how SRV records drive service discovery.",
     "examples": [
      {
       "label": "Custom resolver: dedicated DNS server, timeouts, SRV lookup",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"context\"\n    \"fmt\"\n    \"log\"\n    \"net\"\n    \"time\"\n)\n\nfunc main() {\n    r := &net.Resolver{\n        PreferGo: true, // force the pure-Go resolver\n        Dial: func(ctx context.Context, network, _ string) (net.Conn, error) {\n            d := net.Dialer{Timeout: 500 * time.Millisecond}\n            return d.DialContext(ctx, network, \"1.1.1.1:53\") // ignore resolv.conf server\n        },\n    }\n    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)\n    defer cancel()\n\n    ips, err := r.LookupNetIP(ctx, \"ip4\", \"go.dev\")\n    if err != nil {\n        log.Fatal(err)\n    }\n    fmt.Println(\"A records:\", ips)\n\n    // Queries _xmpp-server._tcp.jabber.org\n    _, srvs, err := r.LookupSRV(ctx, \"xmpp-server\", \"tcp\", \"jabber.org\")\n    if err != nil {\n        log.Fatal(err)\n    }\n    for _, s := range srvs {\n        fmt.Printf(\"%s:%d prio=%d weight=%d\\n\", s.Target, s.Port, s.Priority, s.Weight)\n    }\n}"
      },
      {
       "label": "Inspect / force resolver choice",
       "lang": "bash",
       "code": "# Log which resolver Go picks for each lookup\nGODEBUG=netdns=go+1 ./server\n\n# Build a static binary that always uses the pure-Go resolver\nCGO_ENABLED=0 go build -o server ./cmd/server\ngo build -tags netgo -o server ./cmd/server   # same resolver choice with cgo enabled"
      }
     ]
    },
    {
     "title": "Reverse Proxy & L7 Load Balancer (httputil.ReverseProxy)",
     "def": "<code>httputil.ReverseProxy</code> is a production-grade <code>http.Handler</code>: it clones the request, removes hop-by-hop headers (<code>Connection</code>, <code>Keep-Alive</code>, <code>TE</code>, <code>Transfer-Encoding</code>, ...), forwards via its <code>Transport</code>, streams the response back, and supports trailers, HTTP/2 and protocol upgrades (WebSockets). <ul> <li><strong>Rewrite hook (Go 1.20+)</strong> — receives <code>*httputil.ProxyRequest</code> with <code>In</code> (original, read-only) and <code>Out</code>. <code>pr.SetURL(target)</code> sets scheme/host, joins the base path and rewrites the Host header; <code>pr.SetXForwarded()</code> sets <code>X-Forwarded-For/Host/Proto</code>. Prefer it over the legacy <code>Director</code>: hop-by-hop removal runs <em>after</em> Director, so a client sending <code>Connection: X-Forwarded-For</code> could strip headers you added; Rewrite also drops client-supplied <code>X-Forwarded-*</code> by default (no spoofing).</li> <li><strong>Other hooks</strong> — <code>ModifyResponse</code> (edit/inspect upstream responses), <code>ErrorHandler</code> (return 502 and record a passive health-check failure), <code>FlushInterval: -1</code> for streaming (SSE responses are flushed immediately anyway).</li> <li><strong>Balancing</strong> — round-robin (<code>atomic.Uint64</code> counter mod n), <strong>least-connections</strong> (per-backend in-flight counter; better when request cost varies), power-of-two-choices (pick 2 random, take the less loaded), consistent hashing for cache affinity.</li> <li><strong>Health</strong> — active checks (ticker probing <code>/healthz</code> with a short timeout) plus passive checks (errors from real traffic), with thresholds to avoid flapping.</li> <li><strong>Connection reuse</strong> — share one tuned <code>*http.Transport</code>. The default <code>MaxIdleConnsPerHost</code> is <strong>2</strong>: under concurrency the proxy constantly opens and closes upstream connections → TIME_WAIT pile-up and port exhaustion. Raise it, set <code>IdleConnTimeout</code>, <code>ResponseHeaderTimeout</code> and dial timeouts.</li> </ul>",
     "interview": "A classic senior exercise is \"build a load balancer in Go\". Interviewers look for: using ReverseProxy instead of hand-copying bytes, Rewrite vs Director and X-Forwarded-For trust, the per-host idle pool default of 2, thread-safe backend selection with atomics, active + passive health checks with hysteresis, and what happens to in-flight requests when a backend dies (retry only idempotent requests).",
     "examples": [
      {
       "label": "Single-backend proxy with Rewrite and a tuned Transport",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"log\"\n    \"net\"\n    \"net/http\"\n    \"net/http/httputil\"\n    \"net/url\"\n    \"time\"\n)\n\nfunc main() {\n    target, err := url.Parse(\"http://127.0.0.1:8081\")\n    if err != nil {\n        log.Fatal(err)\n    }\n    tr := &http.Transport{\n        DialContext:           (&net.Dialer{Timeout: 2 * time.Second, KeepAlive: 30 * time.Second}).DialContext,\n        MaxIdleConns:          512,\n        MaxIdleConnsPerHost:   128, // default is 2!\n        IdleConnTimeout:       90 * time.Second,\n        ResponseHeaderTimeout: 10 * time.Second,\n        ForceAttemptHTTP2:     true,\n    }\n    rp := &httputil.ReverseProxy{\n        Rewrite: func(pr *httputil.ProxyRequest) {\n            pr.SetURL(target)  // scheme, host, base path, Host header\n            pr.SetXForwarded() // X-Forwarded-For/Host/Proto\n            pr.Out.Header.Set(\"X-Edge\", \"proxy-1\")\n        },\n        Transport: tr,\n        ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {\n            log.Printf(\"upstream error: %v\", err)\n            http.Error(w, \"bad gateway\", http.StatusBadGateway)\n        },\n    }\n    srv := &http.Server{Addr: \":8080\", Handler: rp, ReadHeaderTimeout: 5 * time.Second}\n    log.Fatal(srv.ListenAndServe())\n}"
      }
     ]
    },
    {
     "title": "gRPC & Protocol Buffers",
     "def": "<strong>gRPC</strong> is an RPC framework over <strong>HTTP/2</strong> using <strong>Protocol Buffers</strong> for the IDL and binary encoding. You define services in a <code>.proto</code> file and generate Go code with <code>protoc-gen-go</code> (messages) and <code>protoc-gen-go-grpc</code> (client/server stubs), or with <code>buf generate</code>. <ul> <li><strong>Four RPC kinds</strong> — unary, server-streaming, client-streaming, bidirectional streaming. Streams are ordered and flow-controlled per HTTP/2 stream.</li> <li><strong>Interceptors</strong> — middleware for unary and stream calls on both client and server (<code>grpc.ChainUnaryInterceptor</code>, <code>grpc.ChainStreamInterceptor</code>): logging, auth, metrics, panic recovery, retries. The first interceptor in the chain is the outermost.</li> <li><strong>Deadlines &amp; cancellation</strong> — a client <code>context.WithTimeout</code> is sent as the <code>grpc-timeout</code> header; the server sees it as <code>ctx.Deadline()</code> and must pass <code>ctx</code> to downstream calls so the budget shrinks hop by hop. Cancelling the client ctx cancels the server ctx.</li> <li><strong>Status codes</strong> — return <code>status.Error(codes.NotFound, \"...\")</code>; inspect with <code>status.Code(err)</code>. Know <code>InvalidArgument</code>, <code>NotFound</code>, <code>AlreadyExists</code>, <code>PermissionDenied</code>, <code>Unauthenticated</code>, <code>ResourceExhausted</code>, <code>FailedPrecondition</code>, <code>Unavailable</code> (retryable), <code>DeadlineExceeded</code>, <code>Internal</code>.</li> <li><strong>Clients</strong> — <code>grpc.NewClient</code> (replaces the deprecated <code>grpc.Dial</code>) creates a lazily-connecting, concurrency-safe <code>*grpc.ClientConn</code>; create one per target and reuse it. Unlike <code>Dial</code> (which defaulted to the <code>passthrough</code> resolver), its default resolver scheme is <code>dns</code>, so gRPC itself resolves a bare <code>host:port</code> target; the default LB policy is still <code>pick_first</code>, so configure <code>round_robin</code> to spread RPCs across addresses.</li> <li><strong>Load balancing</strong> — one long-lived HTTP/2 connection multiplexes all RPCs, so an L4 balancer (a Kubernetes ClusterIP) pins all traffic to one pod. Use client-side LB (<code>dns:///</code> target + headless Service + <code>round_robin</code> policy) or an L7 proxy/mesh (Envoy, Linkerd, Istio).</li> <li><strong>Schema evolution</strong> — never change or reuse field numbers; mark removed ones <code>reserved</code>; adding fields is backward compatible.</li> </ul>",
     "interview": "Be ready for \"gRPC vs REST\" (binary protobuf + HTTP/2 + streaming + generated clients + strict contracts vs. ubiquity, browser support, human-readable JSON and HTTP caching), \"how do deadlines propagate\", \"why is gRPC traffic unbalanced on Kubernetes\", and \"how do you evolve a proto without breaking clients\". Mapping errors to the right status code (and which ones are retryable) is a strong senior signal.",
     "examples": [
      {
       "label": "orders.proto — unary and server-streaming RPCs",
       "lang": "protobuf",
       "code": "syntax = \"proto3\";\n\npackage orders.v1;\noption go_package = \"example.com/orders/gen/ordersv1\";\n\nservice OrderService {\n  rpc GetOrder(GetOrderRequest) returns (Order);                  // unary\n  rpc WatchOrders(WatchOrdersRequest) returns (stream Order);     // server streaming\n}\n\nmessage GetOrderRequest { string id = 1; }\nmessage WatchOrdersRequest { string customer_id = 1; }\n\nmessage Order {\n  string id = 1;\n  string customer_id = 2;\n  int64 amount_cents = 3;\n  reserved 4;            // removed field: never reuse the number\n  reserved \"coupon\";\n}\n\n// protoc --go_out=. --go-grpc_out=. orders.proto   (or: buf generate)"
      },
      {
       "label": "Server interceptors + client with deadline and round-robin LB",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"context\"\n    \"log\"\n    \"log/slog\"\n    \"time\"\n\n    \"google.golang.org/grpc\"\n    \"google.golang.org/grpc/codes\"\n    \"google.golang.org/grpc/credentials/insecure\"\n    \"google.golang.org/grpc/status\"\n)\n\nfunc logging(ctx context.Context, req any, info *grpc.UnaryServerInfo, h grpc.UnaryHandler) (any, error) {\n    start := time.Now()\n    resp, err := h(ctx, req)\n    slog.InfoContext(ctx, \"rpc\", \"method\", info.FullMethod,\n        \"code\", status.Code(err).String(), \"dur\", time.Since(start))\n    return resp, err\n}\n\nfunc requireDeadline(ctx context.Context, req any, info *grpc.UnaryServerInfo, h grpc.UnaryHandler) (any, error) {\n    if _, ok := ctx.Deadline(); !ok {\n        return nil, status.Error(codes.InvalidArgument, \"a deadline is required\")\n    }\n    return h(ctx, req)\n}\n\nfunc main() {\n    srv := grpc.NewServer(grpc.ChainUnaryInterceptor(logging, requireDeadline))\n    _ = srv // ordersv1.RegisterOrderServiceServer(srv, &orderServer{}); srv.Serve(lis)\n\n    // Client: dns:/// + headless Service gives one subconn per pod; round_robin spreads RPCs.\n    conn, err := grpc.NewClient(\"dns:///orders.prod.svc.cluster.local:50051\",\n        grpc.WithTransportCredentials(insecure.NewCredentials()), // use mTLS in production\n        grpc.WithDefaultServiceConfig(`{\"loadBalancingConfig\":[{\"round_robin\":{}}]}`),\n    )\n    if err != nil {\n        log.Fatal(err)\n    }\n    defer conn.Close()\n\n    ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)\n    defer cancel()\n    _ = ctx // resp, err := ordersv1.NewOrderServiceClient(conn).GetOrder(ctx, req)\n    // if status.Code(err) == codes.DeadlineExceeded { ... }\n}"
      }
     ]
    },
    {
     "title": "HTTP/2, WebSockets and Streaming (brief)",
     "def": "<strong>HTTP/2</strong> adds binary framing, many concurrent <em>streams</em> multiplexed over one TCP connection, HPACK header compression and per-stream flow control. Go's <code>net/http</code> negotiates h2 automatically via ALPN for TLS servers and clients. For cleartext <strong>h2c</strong> (common behind a mesh or for gRPC), Go 1.24 added <code>http.Protocols</code>: set <code>SetUnencryptedHTTP2(true)</code> on <code>Server.Protocols</code> — no <code>x/net/http2/h2c</code> wrapper needed. HTTP/2 still suffers TCP-level head-of-line blocking; HTTP/3 (QUIC over UDP) fixes that (<code>quic-go</code>). <ul> <li><strong>Streaming responses</strong> — use <code>http.ResponseController</code> (Go 1.20) to <code>Flush()</code> and set per-request read/write deadlines; Server-Sent Events are a simple one-way alternative to WebSockets.</li> <li><strong>WebSockets</strong> (RFC 6455) — an HTTP/1.1 <code>Upgrade</code> → <code>101 Switching Protocols</code>, then full-duplex message frames with ping/pong keepalives. Not in the stdlib: use <code>github.com/coder/websocket</code> (context-aware, formerly nhooyr.io/websocket) or <code>github.com/gorilla/websocket</code> (at most one concurrent reader and one concurrent writer — use a dedicated writer goroutine fed by a bounded channel).</li> <li><strong>Security</strong> — validate <code>Origin</code> to prevent cross-site WebSocket hijacking; cap message size; authenticate during the upgrade request.</li> <li><strong>Operations</strong> — connections are long-lived and pin to one replica: broadcasting across replicas needs a backplane (Redis pub/sub, NATS); <code>http.Server.Shutdown</code> does not track hijacked connections, so close them yourself (<code>RegisterOnShutdown</code>).</li> </ul>",
     "interview": "Typical questions: \"HTTP/1.1 vs HTTP/2 vs HTTP/3\", \"when would you choose WebSockets vs SSE vs gRPC streaming\", and \"how do you scale 1M WebSocket connections\" (goroutine + buffers per connection, slow-consumer handling with bounded queues, pub/sub backplane, connection draining on deploy, sticky connections at the load balancer).",
     "examples": [
      {
       "label": "h2c server without x/net (Go 1.24+) and a WebSocket echo handler",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"fmt\"\n    \"log\"\n    \"net/http\"\n    \"time\"\n\n    \"github.com/coder/websocket\"\n)\n\nfunc echo(w http.ResponseWriter, r *http.Request) {\n    c, err := websocket.Accept(w, r, nil) // rejects cross-origin requests by default\n    if err != nil {\n        return\n    }\n    defer c.CloseNow()\n    c.SetReadLimit(64 << 10)\n    for {\n        typ, msg, err := c.Read(r.Context())\n        if err != nil {\n            return // client closed or ctx cancelled\n        }\n        if err := c.Write(r.Context(), typ, msg); err != nil {\n            return\n        }\n    }\n}\n\nfunc main() {\n    mux := http.NewServeMux()\n    mux.HandleFunc(\"GET /ws\", echo)\n    mux.HandleFunc(\"GET /\", func(w http.ResponseWriter, r *http.Request) {\n        fmt.Fprintf(w, \"proto=%s\\n\", r.Proto) // HTTP/2.0 for h2c clients\n    })\n\n    var p http.Protocols\n    p.SetHTTP1(true)\n    p.SetUnencryptedHTTP2(true) // curl --http2-prior-knowledge http://localhost:8080/\n    srv := &http.Server{Addr: \":8080\", Handler: mux, Protocols: &p, ReadHeaderTimeout: 5 * time.Second}\n    log.Fatal(srv.ListenAndServe())\n}"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "TCP echo server with idle timeout and connection cap",
     "d": "easy",
     "type": "coding",
     "hint": "<ul> <li>Accept loop + one goroutine per connection; <code>defer conn.Close()</code>.</li> <li>Re-arm <code>SetReadDeadline</code> before every <code>Read</code> to implement an <em>idle</em> timeout (<code>io.Copy</code> can't do that).</li> <li>Use a buffered channel as a semaphore; if full, close the new connection immediately (load shedding).</li> <li>Handle <code>n &gt; 0</code> <em>before</em> checking <code>err</code> — Read can return data and EOF together.</li> </ul>",
     "lang": "go",
     "solution": "package main\n\nimport (\n    \"errors\"\n    \"log\"\n    \"net\"\n    \"os\"\n    \"time\"\n)\n\nconst (\n    maxConns    = 1000\n    idleTimeout = 30 * time.Second\n)\n\nfunc main() {\n    ln, err := net.Listen(\"tcp\", \":9000\")\n    if err != nil {\n        log.Fatal(err)\n    }\n    sem := make(chan struct{}, maxConns)\n    for {\n        conn, err := ln.Accept()\n        if err != nil {\n            if errors.Is(err, net.ErrClosed) {\n                return\n            }\n            log.Print(\"accept: \", err)\n            time.Sleep(10 * time.Millisecond)\n            continue\n        }\n        select {\n        case sem <- struct{}{}:\n            go func() {\n                defer func() { <-sem }()\n                echo(conn)\n            }()\n        default:\n            conn.Close() // over capacity: shed load instead of queueing\n        }\n    }\n}\n\nfunc echo(c net.Conn) {\n    defer c.Close()\n    buf := make([]byte, 4096)\n    for {\n        c.SetReadDeadline(time.Now().Add(idleTimeout))\n        n, err := c.Read(buf)\n        if n > 0 {\n            c.SetWriteDeadline(time.Now().Add(5 * time.Second))\n            if _, werr := c.Write(buf[:n]); werr != nil {\n                return\n            }\n        }\n        if err != nil {\n            if errors.Is(err, os.ErrDeadlineExceeded) {\n                log.Printf(\"%s idle, closing\", c.RemoteAddr())\n            }\n            return // io.EOF or a real error\n        }\n    }\n}"
    },
    {
     "t": "Length-prefixed message framing over TCP",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Frame = 4-byte big-endian length + payload (<code>binary.BigEndian.PutUint32</code>).</li> <li>Read with <code>io.ReadFull</code> — a single <code>Read</code> may return fewer bytes.</li> <li>Reject lengths above a maximum <em>before</em> allocating, or a hostile peer sends <code>0xFFFFFFFF</code> and OOMs you.</li> <li>EOF between frames is a clean close; EOF mid-frame is <code>io.ErrUnexpectedEOF</code>.</li> <li>Wrap the conn in <code>bufio.Reader</code>/<code>bufio.Writer</code> to cut syscalls.</li> </ul>",
     "lang": "go",
     "solution": "package framing\n\nimport (\n    \"encoding/binary\"\n    \"errors\"\n    \"fmt\"\n    \"io\"\n)\n\nconst MaxFrame = 1 << 20 // 1 MiB guard against hostile length prefixes\n\nvar ErrFrameTooLarge = errors.New(\"frame too large\")\n\n// WriteFrame writes a 4-byte big-endian length followed by the payload.\nfunc WriteFrame(w io.Writer, payload []byte) error {\n    if len(payload) > MaxFrame {\n        return ErrFrameTooLarge\n    }\n    // One Write call: avoids sending the header and body as separate tiny segments.\n    buf := make([]byte, 4, 4+len(payload))\n    binary.BigEndian.PutUint32(buf, uint32(len(payload)))\n    _, err := w.Write(append(buf, payload...))\n    return err\n}\n\n// ReadFrame reads exactly one frame. io.ReadFull loops over short reads.\nfunc ReadFrame(r io.Reader) ([]byte, error) {\n    var hdr [4]byte\n    if _, err := io.ReadFull(r, hdr[:]); err != nil {\n        return nil, err // io.EOF here = peer closed cleanly between frames\n    }\n    n := binary.BigEndian.Uint32(hdr[:])\n    if n > MaxFrame {\n        return nil, fmt.Errorf(\"%w: %d bytes\", ErrFrameTooLarge, n)\n    }\n    payload := make([]byte, n)\n    if _, err := io.ReadFull(r, payload); err != nil {\n        if errors.Is(err, io.EOF) {\n            err = io.ErrUnexpectedEOF // truncated mid-frame\n        }\n        return nil, err\n    }\n    return payload, nil\n}"
    },
    {
     "t": "UDP request/response client with timeout and retries",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Use \"connected\" UDP (<code>net.Dial(\"udp\", addr)</code>) so stray packets from other hosts are filtered and ICMP errors surface as <code>ECONNREFUSED</code>.</li> <li>Per attempt: write, <code>SetReadDeadline</code>, read; on <code>os.ErrDeadlineExceeded</code> retry with a doubled timeout.</li> <li>Requests must be idempotent — a lost <em>reply</em> may hide a processed request.</li> <li>Production: put a request ID in the payload and discard late replies to earlier attempts.</li> </ul>",
     "lang": "go",
     "solution": "package main\n\nimport (\n    \"errors\"\n    \"fmt\"\n    \"log\"\n    \"net\"\n    \"os\"\n    \"time\"\n)\n\n// Query sends req and waits for one reply datagram, retrying on timeout.\nfunc Query(addr string, req []byte, attempts int, timeout time.Duration) ([]byte, error) {\n    conn, err := net.Dial(\"udp\", addr) // connected UDP: fixed peer\n    if err != nil {\n        return nil, err\n    }\n    defer conn.Close()\n\n    buf := make([]byte, 1500)\n    for range attempts {\n        if _, err := conn.Write(req); err != nil {\n            return nil, err\n        }\n        conn.SetReadDeadline(time.Now().Add(timeout))\n        n, err := conn.Read(buf)\n        if err == nil {\n            return append([]byte(nil), buf[:n]...), nil\n        }\n        if !errors.Is(err, os.ErrDeadlineExceeded) {\n            return nil, err // e.g. connection refused (ICMP port unreachable)\n        }\n        timeout *= 2 // exponential backoff\n    }\n    return nil, fmt.Errorf(\"no reply from %s after %d attempts\", addr, attempts)\n}\n\nfunc main() {\n    resp, err := Query(\"127.0.0.1:9001\", []byte(\"ping\"), 3, 200*time.Millisecond)\n    if err != nil {\n        log.Fatal(err)\n    }\n    fmt.Printf(\"%s\\n\", resp)\n}"
    },
    {
     "t": "SRV-based service discovery with timeout and stale-on-error cache",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li><code>Resolver.LookupSRV(ctx, service, proto, name)</code> → targets already sorted by priority and weight-shuffled (RFC 2782).</li> <li>Bound each lookup with <code>context.WithTimeout</code>; check <code>*net.DNSError</code> <code>IsNotFound</code>/<code>IsTimeout</code>.</li> <li>Go has no DNS cache: wrap the lookup in a small TTL cache and serve the last good answer if DNS fails (stale-on-error keeps you up during a DNS blip).</li> <li>Trim the trailing dot from targets and build addresses with <code>net.JoinHostPort</code> (IPv6-safe).</li> </ul>",
     "lang": "go",
     "solution": "package discovery\n\nimport (\n    \"context\"\n    \"errors\"\n    \"fmt\"\n    \"net\"\n    \"strconv\"\n    \"strings\"\n    \"sync\"\n    \"time\"\n)\n\ntype Endpoint struct {\n    Addr     string\n    Priority uint16\n    Weight   uint16\n}\n\n// Discover resolves _service._proto.name into dialable endpoints.\nfunc Discover(ctx context.Context, r *net.Resolver, service, proto, name string) ([]Endpoint, error) {\n    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)\n    defer cancel()\n    _, srvs, err := r.LookupSRV(ctx, service, proto, name)\n    if err != nil {\n        var dnsErr *net.DNSError\n        if errors.As(err, &dnsErr) && dnsErr.IsNotFound {\n            return nil, fmt.Errorf(\"no SRV records for %s: %w\", name, err)\n        }\n        return nil, err\n    }\n    eps := make([]Endpoint, 0, len(srvs))\n    for _, s := range srvs {\n        host := strings.TrimSuffix(s.Target, \".\")\n        eps = append(eps, Endpoint{\n            Addr:     net.JoinHostPort(host, strconv.Itoa(int(s.Port))),\n            Priority: s.Priority,\n            Weight:   s.Weight,\n        })\n    }\n    return eps, nil\n}\n\n// Cache refreshes at most once per TTL and serves stale data if DNS fails.\ntype Cache struct {\n    TTL    time.Duration\n    Lookup func(context.Context) ([]Endpoint, error)\n\n    mu      sync.Mutex // also collapses concurrent refreshes into one lookup\n    eps     []Endpoint\n    fetched time.Time\n}\n\nfunc (c *Cache) Get(ctx context.Context) ([]Endpoint, error) {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    if c.eps != nil && time.Since(c.fetched) < c.TTL {\n        return c.eps, nil\n    }\n    eps, err := c.Lookup(ctx)\n    if err != nil {\n        if c.eps != nil {\n            return c.eps, nil // stale-on-error\n        }\n        return nil, err\n    }\n    c.eps, c.fetched = eps, time.Now()\n    return eps, nil\n}"
    },
    {
     "t": "Debug: HTTP client exhausting ports (TIME_WAIT) and leaking connections",
     "d": "medium",
     "type": "debug",
     "hint": "Symptoms: rising TIME_WAIT sockets, <code>connect: cannot assign requested address</code>, goroutine and FD growth, latency spikes. Look for: <ul> <li>A new <code>http.Client</code>/<code>http.Transport</code> per request (no pooling).</li> <li><code>resp.Body</code> not closed on every path (e.g. the non-200 branch).</li> <li>Body not drained to EOF, so the connection can't return to the pool.</li> <li>Default <code>MaxIdleConnsPerHost = 2</code> under high concurrency to one host.</li> <li>No timeouts (<code>http.Client{}</code> waits forever).</li> </ul>",
     "lang": "go",
     "solution": "// BUGGY version:\n//\n//   func fetchID(url string) (int, error) {\n//       c := &http.Client{Transport: &http.Transport{}}  // new pool per call, no timeout\n//       resp, err := c.Get(url)\n//       if err != nil { return 0, err }\n//       if resp.StatusCode != 200 { return 0, errors.New(resp.Status) } // body leaked\n//       defer resp.Body.Close()\n//       var v struct{ ID int }\n//       json.NewDecoder(resp.Body).Decode(&v)  // may stop before EOF; error ignored\n//       return v.ID, nil\n//   }\n//\n// FIXED version:\npackage fetch\n\nimport (\n    \"context\"\n    \"encoding/json\"\n    \"fmt\"\n    \"io\"\n    \"net\"\n    \"net/http\"\n    \"time\"\n)\n\n// One shared client per process: its Transport owns the connection pool.\nvar client = &http.Client{\n    Timeout: 10 * time.Second, // overall cap including reading the body\n    Transport: &http.Transport{\n        Proxy:                 http.ProxyFromEnvironment,\n        DialContext:           (&net.Dialer{Timeout: 2 * time.Second, KeepAlive: 30 * time.Second}).DialContext,\n        MaxIdleConns:          200,\n        MaxIdleConnsPerHost:   50, // default 2 → churn + TIME_WAIT under concurrency\n        IdleConnTimeout:       90 * time.Second,\n        TLSHandshakeTimeout:   5 * time.Second,\n        ResponseHeaderTimeout: 5 * time.Second,\n    },\n}\n\nfunc FetchID(ctx context.Context, url string) (int, error) {\n    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)\n    if err != nil {\n        return 0, err\n    }\n    resp, err := client.Do(req)\n    if err != nil {\n        return 0, err\n    }\n    defer resp.Body.Close() // on EVERY path\n    if resp.StatusCode != http.StatusOK {\n        io.Copy(io.Discard, io.LimitReader(resp.Body, 64<<10)) // drain so the conn is reused\n        return 0, fmt.Errorf(\"unexpected status %s\", resp.Status)\n    }\n    var v struct{ ID int }\n    if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {\n        return 0, err\n    }\n    io.Copy(io.Discard, resp.Body) // Decode can stop before EOF\n    return v.ID, nil\n}"
    },
    {
     "t": "Graceful TCP server shutdown with a drain deadline",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Track listeners and live connections in maps guarded by a mutex; count handlers with a <code>sync.WaitGroup</code>.</li> <li>Shutdown: set a <code>closing</code> flag, close listeners (Accept returns <code>net.ErrClosed</code>), cancel a server context so handlers finish their current message.</li> <li>Wait for the WaitGroup <em>or</em> the caller's deadline; on deadline force-close remaining conns (unblocks their Read/Write).</li> <li>Never call <code>wg.Add</code> after shutdown started — check the flag under the same lock.</li> </ul>",
     "lang": "go",
     "solution": "package tcpserver\n\nimport (\n    \"context\"\n    \"errors\"\n    \"net\"\n    \"sync\"\n)\n\ntype Server struct {\n    handler func(ctx context.Context, c net.Conn)\n    ctx     context.Context // cancelled when draining starts\n    cancel  context.CancelFunc\n    wg      sync.WaitGroup\n\n    mu      sync.Mutex\n    closing bool\n    lns     []net.Listener\n    conns   map[net.Conn]struct{}\n}\n\nfunc New(h func(context.Context, net.Conn)) *Server {\n    ctx, cancel := context.WithCancel(context.Background())\n    return &Server{handler: h, ctx: ctx, cancel: cancel, conns: map[net.Conn]struct{}{}}\n}\n\nfunc (s *Server) Serve(ln net.Listener) error {\n    s.mu.Lock()\n    if s.closing {\n        s.mu.Unlock()\n        ln.Close()\n        return net.ErrClosed\n    }\n    s.lns = append(s.lns, ln)\n    s.mu.Unlock()\n\n    for {\n        c, err := ln.Accept()\n        if err != nil {\n            if errors.Is(err, net.ErrClosed) {\n                return nil // Shutdown called\n            }\n            return err\n        }\n        s.mu.Lock()\n        if s.closing { // raced with Shutdown\n            s.mu.Unlock()\n            c.Close()\n            return nil\n        }\n        s.conns[c] = struct{}{}\n        s.wg.Add(1)\n        s.mu.Unlock()\n\n        go func() {\n            defer func() {\n                c.Close()\n                s.mu.Lock()\n                delete(s.conns, c)\n                s.mu.Unlock()\n                s.wg.Done()\n            }()\n            s.handler(s.ctx, c) // handler should watch ctx / use read deadlines\n        }()\n    }\n}\n\n// Shutdown stops accepting, asks handlers to finish, and waits until they return\n// or ctx expires — then force-closes whatever is left.\nfunc (s *Server) Shutdown(ctx context.Context) error {\n    s.mu.Lock()\n    s.closing = true\n    for _, ln := range s.lns {\n        ln.Close()\n    }\n    s.mu.Unlock()\n    s.cancel()\n\n    done := make(chan struct{})\n    go func() { s.wg.Wait(); close(done) }()\n    select {\n    case <-done:\n        return nil\n    case <-ctx.Done():\n        s.mu.Lock()\n        for c := range s.conns {\n            c.Close() // unblocks pending Read/Write\n        }\n        s.mu.Unlock()\n        <-done\n        return ctx.Err()\n    }\n}"
    },
    {
     "t": "Round-robin L7 load balancer with httputil.ReverseProxy",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>One <code>ReverseProxy</code> per backend, all sharing a single tuned <code>Transport</code>.</li> <li>Pick a backend with an <code>atomic.Uint64</code> counter: <code>(next.Add(1)-1) % n</code> — no mutex on the hot path.</li> <li>Use <code>Rewrite</code> with <code>SetURL</code> + <code>SetXForwarded</code>.</li> <li>Extensions interviewers ask for: skip unhealthy backends, weights, retries for idempotent methods.</li> </ul>",
     "lang": "go",
     "solution": "package main\n\nimport (\n    \"log\"\n    \"net/http\"\n    \"net/http/httputil\"\n    \"net/url\"\n    \"sync/atomic\"\n    \"time\"\n)\n\ntype RoundRobin struct {\n    proxies []*httputil.ReverseProxy\n    next    atomic.Uint64\n}\n\nfunc NewRoundRobin(targets []string, tr http.RoundTripper) (*RoundRobin, error) {\n    rr := &RoundRobin{}\n    for _, t := range targets {\n        u, err := url.Parse(t)\n        if err != nil {\n            return nil, err\n        }\n        rr.proxies = append(rr.proxies, &httputil.ReverseProxy{\n            Rewrite: func(pr *httputil.ProxyRequest) {\n                pr.SetURL(u) // u is per-iteration (Go 1.22 loop semantics)\n                pr.SetXForwarded()\n            },\n            Transport: tr, // shared connection pool\n        })\n    }\n    return rr, nil\n}\n\nfunc (rr *RoundRobin) ServeHTTP(w http.ResponseWriter, r *http.Request) {\n    i := (rr.next.Add(1) - 1) % uint64(len(rr.proxies))\n    rr.proxies[i].ServeHTTP(w, r)\n}\n\nfunc main() {\n    tr := http.DefaultTransport.(*http.Transport).Clone()\n    tr.MaxIdleConnsPerHost = 100\n    tr.ResponseHeaderTimeout = 10 * time.Second\n\n    lb, err := NewRoundRobin([]string{\"http://127.0.0.1:8081\", \"http://127.0.0.1:8082\"}, tr)\n    if err != nil {\n        log.Fatal(err)\n    }\n    srv := &http.Server{Addr: \":8080\", Handler: lb, ReadHeaderTimeout: 5 * time.Second}\n    log.Fatal(srv.ListenAndServe())\n}"
    },
    {
     "t": "gRPC interceptor chain: logging, panic recovery, deadline cap",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Unary server interceptor signature: <code>func(ctx, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error)</code>.</li> <li>Recovery uses a named return + <code>defer recover()</code> and converts panics to <code>codes.Internal</code> (never leak stack traces to clients).</li> <li>Cap the server budget: if there is no deadline or it is too far out, wrap ctx with <code>context.WithTimeout</code>.</li> <li>A client interceptor that adds a default deadline protects against callers who forget one.</li> <li>Order: <code>ChainUnaryInterceptor(a, b, c)</code> runs a → b → c → handler; put logging outermost.</li> </ul>",
     "lang": "go",
     "solution": "package interceptors\n\nimport (\n    \"context\"\n    \"log/slog\"\n    \"runtime/debug\"\n    \"time\"\n\n    \"google.golang.org/grpc\"\n    \"google.golang.org/grpc/codes\"\n    \"google.golang.org/grpc/status\"\n)\n\n// Logging records method, status code and latency for every call.\nfunc Logging(ctx context.Context, req any, info *grpc.UnaryServerInfo, h grpc.UnaryHandler) (any, error) {\n    start := time.Now()\n    resp, err := h(ctx, req)\n    slog.InfoContext(ctx, \"grpc\", \"method\", info.FullMethod,\n        \"code\", status.Code(err).String(), \"latency\", time.Since(start))\n    return resp, err\n}\n\n// Recovery converts panics into codes.Internal instead of crashing the process.\nfunc Recovery(ctx context.Context, req any, info *grpc.UnaryServerInfo, h grpc.UnaryHandler) (resp any, err error) {\n    defer func() {\n        if p := recover(); p != nil {\n            slog.ErrorContext(ctx, \"panic\", \"method\", info.FullMethod, \"panic\", p, \"stack\", string(debug.Stack()))\n            err = status.Error(codes.Internal, \"internal error\")\n        }\n    }()\n    return h(ctx, req)\n}\n\n// MaxDeadline caps the server-side budget even if the client sent none or a huge one.\nfunc MaxDeadline(limit time.Duration) grpc.UnaryServerInterceptor {\n    return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, h grpc.UnaryHandler) (any, error) {\n        if dl, ok := ctx.Deadline(); !ok || time.Until(dl) > limit {\n            var cancel context.CancelFunc\n            ctx, cancel = context.WithTimeout(ctx, limit)\n            defer cancel()\n        }\n        return h(ctx, req)\n    }\n}\n\n// ClientDefaultTimeout makes sure every outgoing call carries a deadline (sent as grpc-timeout).\nfunc ClientDefaultTimeout(d time.Duration) grpc.UnaryClientInterceptor {\n    return func(ctx context.Context, method string, req, reply any, cc *grpc.ClientConn,\n        invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {\n        if _, ok := ctx.Deadline(); !ok {\n            var cancel context.CancelFunc\n            ctx, cancel = context.WithTimeout(ctx, d)\n            defer cancel()\n        }\n        return invoker(ctx, method, req, reply, cc, opts...)\n    }\n}\n\nfunc NewServer() *grpc.Server {\n    // Logging outermost (sees the final code), Recovery innermost (wraps the handler).\n    return grpc.NewServer(grpc.ChainUnaryInterceptor(Logging, MaxDeadline(5*time.Second), Recovery))\n}"
    },
    {
     "t": "Least-connections load balancer with active and passive health checks",
     "d": "hard",
     "type": "coding",
     "hint": "<ul> <li>Per backend: <code>atomic.Int64</code> in-flight counter, <code>atomic.Bool</code> healthy flag, consecutive-failure counter.</li> <li>Pick the healthy backend with the fewest in-flight requests; increment before proxying, decrement in a <code>defer</code>.</li> <li>Active: a ticker goroutine probes <code>GET /healthz</code> with a 1 s client timeout. Passive: <code>ErrorHandler</code> records failures from real traffic.</li> <li>Hysteresis — mark down after N consecutive failures to avoid flapping; return 503 when nothing is healthy.</li> <li>Discuss: O(n) scan vs power-of-two-choices for many backends; retrying idempotent requests on another backend.</li> </ul>",
     "lang": "go",
     "solution": "package main\n\nimport (\n    \"context\"\n    \"log\"\n    \"net/http\"\n    \"net/http/httputil\"\n    \"net/url\"\n    \"sync/atomic\"\n    \"time\"\n)\n\nconst failThreshold = 3\n\ntype Backend struct {\n    URL      *url.URL\n    proxy    *httputil.ReverseProxy\n    inflight atomic.Int64\n    healthy  atomic.Bool\n    fails    atomic.Int32\n}\n\nfunc (b *Backend) markFailure() {\n    if b.fails.Add(1) >= failThreshold {\n        b.healthy.Store(false)\n    }\n}\n\nfunc (b *Backend) markSuccess() {\n    b.fails.Store(0)\n    b.healthy.Store(true)\n}\n\ntype LB struct {\n    backends []*Backend\n    probe    *http.Client\n}\n\nfunc NewLB(targets []string) (*LB, error) {\n    tr := http.DefaultTransport.(*http.Transport).Clone()\n    tr.MaxIdleConnsPerHost = 100\n    lb := &LB{probe: &http.Client{Timeout: time.Second}}\n    for _, t := range targets {\n        u, err := url.Parse(t)\n        if err != nil {\n            return nil, err\n        }\n        b := &Backend{URL: u}\n        b.healthy.Store(true)\n        b.proxy = &httputil.ReverseProxy{\n            Rewrite:   func(pr *httputil.ProxyRequest) { pr.SetURL(u); pr.SetXForwarded() },\n            Transport: tr,\n            ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {\n                b.markFailure() // passive health check\n                http.Error(w, \"upstream unavailable\", http.StatusBadGateway)\n            },\n        }\n        lb.backends = append(lb.backends, b)\n    }\n    return lb, nil\n}\n\n// pick returns the healthy backend with the fewest in-flight requests.\nfunc (lb *LB) pick() *Backend {\n    var best *Backend\n    for _, b := range lb.backends {\n        if !b.healthy.Load() {\n            continue\n        }\n        if best == nil || b.inflight.Load() < best.inflight.Load() {\n            best = b\n        }\n    }\n    return best\n}\n\nfunc (lb *LB) ServeHTTP(w http.ResponseWriter, r *http.Request) {\n    b := lb.pick()\n    if b == nil {\n        http.Error(w, \"no healthy upstream\", http.StatusServiceUnavailable)\n        return\n    }\n    b.inflight.Add(1)\n    defer b.inflight.Add(-1)\n    b.proxy.ServeHTTP(w, r)\n}\n\n// HealthCheck probes every backend each interval until ctx is cancelled.\nfunc (lb *LB) HealthCheck(ctx context.Context, interval time.Duration) {\n    t := time.NewTicker(interval)\n    defer t.Stop()\n    for {\n        for _, b := range lb.backends {\n            go lb.check(ctx, b)\n        }\n        select {\n        case <-ctx.Done():\n            return\n        case <-t.C:\n        }\n    }\n}\n\nfunc (lb *LB) check(ctx context.Context, b *Backend) {\n    req, err := http.NewRequestWithContext(ctx, http.MethodGet, b.URL.JoinPath(\"/healthz\").String(), nil)\n    if err != nil {\n        return\n    }\n    resp, err := lb.probe.Do(req)\n    if err != nil {\n        if ctx.Err() == nil {\n            b.markFailure()\n        }\n        return\n    }\n    resp.Body.Close()\n    if resp.StatusCode == http.StatusOK {\n        b.markSuccess()\n    } else {\n        b.markFailure()\n    }\n}\n\nfunc main() {\n    lb, err := NewLB([]string{\"http://127.0.0.1:8081\", \"http://127.0.0.1:8082\", \"http://127.0.0.1:8083\"})\n    if err != nil {\n        log.Fatal(err)\n    }\n    go lb.HealthCheck(context.Background(), 5*time.Second)\n    srv := &http.Server{Addr: \":8080\", Handler: lb, ReadHeaderTimeout: 5 * time.Second}\n    log.Fatal(srv.ListenAndServe())\n}"
    },
    {
     "t": "TCP chat server: broadcast hub with slow-consumer handling",
     "d": "hard",
     "type": "coding",
     "hint": "<ul> <li>A single hub goroutine owns the client set (no mutex): <code>join</code>, <code>leave</code>, <code>msgs</code> channels.</li> <li>Each client has a <strong>bounded</strong> outbox channel and a dedicated writer goroutine; the hub uses a non-blocking send — if the outbox is full, the client is too slow and is dropped. One slow reader must never stall everyone.</li> <li>Only the hub closes an outbox (single owner), and it checks membership so a close never happens twice.</li> <li>Write deadlines on the writer; line-length limit on the reader.</li> <li>Scaling out: multiple instances need a pub/sub backplane (Redis, NATS).</li> </ul>",
     "lang": "go",
     "solution": "package main\n\nimport (\n    \"bufio\"\n    \"fmt\"\n    \"log\"\n    \"net\"\n    \"time\"\n)\n\ntype client struct {\n    conn net.Conn\n    out  chan string // bounded outbox protects the hub from slow readers\n}\n\ntype hub struct {\n    join  chan *client\n    leave chan *client\n    msgs  chan string\n}\n\nfunc (h *hub) run() {\n    clients := map[*client]struct{}{}\n    drop := func(c *client) {\n        if _, ok := clients[c]; ok {\n            delete(clients, c)\n            close(c.out) // writer exits and closes the conn\n        }\n    }\n    for {\n        select {\n        case c := <-h.join:\n            clients[c] = struct{}{}\n        case c := <-h.leave:\n            drop(c)\n        case m := <-h.msgs:\n            for c := range clients {\n                select {\n                case c.out <- m:\n                default: // outbox full: slow consumer, disconnect it\n                    drop(c)\n                }\n            }\n        }\n    }\n}\n\nfunc writer(c *client) {\n    defer c.conn.Close() // makes the reader's Scan fail → leave\n    for m := range c.out {\n        c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))\n        if _, err := fmt.Fprintln(c.conn, m); err != nil {\n            return\n        }\n    }\n}\n\nfunc reader(h *hub, c *client) {\n    defer func() { h.leave <- c }()\n    name := c.conn.RemoteAddr().String()\n    sc := bufio.NewScanner(c.conn)\n    sc.Buffer(make([]byte, 1024), 4096) // max line length\n    for sc.Scan() {\n        h.msgs <- name + \": \" + sc.Text()\n    }\n}\n\nfunc main() {\n    ln, err := net.Listen(\"tcp\", \":9000\")\n    if err != nil {\n        log.Fatal(err)\n    }\n    h := &hub{join: make(chan *client), leave: make(chan *client), msgs: make(chan string, 256)}\n    go h.run()\n    for {\n        conn, err := ln.Accept()\n        if err != nil {\n            log.Print(err)\n            continue\n        }\n        c := &client{conn: conn, out: make(chan string, 64)}\n        h.join <- c\n        go writer(c)\n        go reader(h, c)\n    }\n}"
    }
   ],
   "interviewFocus": [
    {
     "q": "What actually happens when a goroutine calls conn.Read on a TCP socket in Go, and why can one process hold 100k connections?",
     "a": "All Go sockets are put in <strong>non-blocking</strong> mode and registered with the runtime <strong>netpoller</strong> (epoll on Linux, kqueue on BSD/macOS, IOCP on Windows). <ol> <li><code>conn.Read</code> issues a non-blocking <code>read(2)</code>; if data is ready it returns immediately.</li> <li>On <code>EAGAIN</code> the goroutine is <strong>parked</strong> on the fd's poll descriptor; its M (OS thread) is free to run other goroutines.</li> <li>When the fd becomes readable, the scheduler (via <code>netpoll</code> in <code>findRunnable</code> or sysmon) marks the goroutine runnable and it retries the read.</li> <li>Deadlines are timers on the poll descriptor; on expiry the waiter is woken with <code>os.ErrDeadlineExceeded</code>.</li> </ol> So an idle connection costs a goroutine (a few KB of stack) plus buffers — not a thread. Limits that matter in practice: file descriptors (<code>ulimit -n</code>), per-connection buffer memory (use small/pooled buffers), and GC pressure from per-connection allocations. Contrast with the cgo DNS resolver or blocking syscalls on files, which <em>do</em> consume OS threads."
    },
    {
     "q": "Design an L7 load balancer in Go. What are the key decisions?",
     "a": "<ul> <li><strong>Data plane</strong>: <code>httputil.ReverseProxy</code> per backend with a <code>Rewrite</code> hook (<code>SetURL</code>, <code>SetXForwarded</code>); a single shared, tuned <code>http.Transport</code> (<code>MaxIdleConnsPerHost</code> ≫ 2, dial/TLS/response-header timeouts, <code>IdleConnTimeout</code>).</li> <li><strong>Selection</strong>: round-robin via atomics for homogeneous requests; least-connections or power-of-two-choices when latency varies; consistent hashing (with bounded load) when you need cache/session affinity.</li> <li><strong>Health</strong>: active probes with rise/fall thresholds + passive ejection on 5xx/connection errors (outlier detection); fail open or 503 when all are down — a deliberate choice.</li> <li><strong>Resilience</strong>: per-try timeouts, retry only idempotent requests and only on another backend, a retry budget (e.g. ≤ 10% extra load), circuit breaking per backend.</li> <li><strong>Server side</strong>: <code>ReadHeaderTimeout</code>, max header size, graceful drain on deploy, trust <code>X-Forwarded-For</code> only from known proxies.</li> <li><strong>Control plane</strong>: dynamic backend set (DNS/SRV, Kubernetes EndpointSlices) swapped atomically (<code>atomic.Pointer[[]*Backend]</code>) without locking the hot path.</li> <li><strong>Observability</strong>: per-backend RED metrics, upstream latency histograms, trace propagation.</li> </ul>"
    },
    {
     "q": "Why is gRPC traffic often unbalanced in Kubernetes, and how do you fix it?",
     "a": "A Kubernetes <code>ClusterIP</code> Service balances at <strong>L4</strong>: kube-proxy (iptables/IPVS) picks a pod per <em>TCP connection</em>. gRPC opens one long-lived HTTP/2 connection and multiplexes every RPC over it, so all requests from a client replica land on one server pod; new pods added by the HPA receive almost nothing. Fixes: <ul> <li><strong>Client-side LB</strong>: a headless Service (<code>clusterIP: None</code>) returns all pod IPs; target <code>dns:///svc.ns.svc.cluster.local:port</code> with the <code>round_robin</code> policy so the client holds one subchannel per pod. Combine with server <code>MaxConnectionAge</code> keepalive so clients periodically reconnect and re-resolve.</li> <li><strong>L7 proxy / service mesh</strong>: Envoy, Linkerd or Istio balance per request.</li> <li><strong>xDS</strong>: gRPC's proxyless mesh support for large fleets.</li> </ul> Mention the trade-off: client-side LB is cheapest but pushes logic into every client; a mesh centralises it at the cost of an extra hop and operational complexity."
    },
    {
     "q": "Explain Go DNS resolution and the production issues it can cause.",
     "a": "<ul> <li><strong>Two resolvers</strong>: pure Go (goroutine-friendly, reads resolv.conf/hosts) vs cgo <code>getaddrinfo</code> (one OS thread per in-flight lookup). On Linux Go picks pure Go unless the config demands libc (nsswitch sources, certain env vars). Force with <code>GODEBUG=netdns=go</code>, <code>-tags netgo</code>, or <code>CGO_ENABLED=0</code>.</li> <li><strong>Thread explosion</strong>: slow DNS + cgo resolver + many concurrent dials → thousands of threads (and the default 10,000-thread limit crash).</li> <li><strong>No caching</strong>: every new connection triggers a lookup; in Kubernetes, <code>ndots:5</code> multiplies each into several queries. Use FQDNs with a trailing dot, NodeLocal DNSCache, and connection reuse.</li> <li><strong>Stale endpoints</strong>: keep-alive pools never re-resolve, so blue/green DNS cutovers don't move traffic; bound connection lifetime (<code>IdleConnTimeout</code>, server-side max connection age, <code>SetConnMaxLifetime</code> for databases).</li> <li><strong>Timeouts</strong>: always pass a context with a deadline; distinguish <code>DNSError.IsNotFound</code> (don't retry) from <code>IsTimeout</code>/<code>IsTemporary</code>.</li> </ul>"
    },
    {
     "q": "TCP is a byte stream — walk through framing, partial reads/writes, half-close and TIME_WAIT.",
     "a": "<ul> <li><strong>Framing</strong>: the kernel coalesces/splits data arbitrarily (Nagle, MSS, receive buffer). An application protocol must delimit messages: delimiter-based (newline, with escaping) or length-prefixed (binary, efficient, needs a max size). <code>io.ReadFull</code> loops until the buffer is full.</li> <li><strong>Writes</strong>: <code>net.Conn.Write</code> in Go loops internally until all bytes are written or an error/deadline occurs, but a deadline can still produce a partial write (<code>n &lt; len(p)</code>).</li> <li><strong>Nagle</strong>: Go sets <code>TCP_NODELAY</code> by default (<code>SetNoDelay(true)</code>), so small writes go out immediately — batch them with <code>bufio.Writer</code>.</li> <li><strong>Half-close</strong>: <code>CloseWrite</code> sends FIN; the peer reads EOF but can still send. Used by request/response protocols that signal \"end of request\" by EOF.</li> <li><strong>TIME_WAIT</strong>: the side that closes first holds the 4-tuple for 2×MSL. A client that opens and closes many short connections to one destination exhausts ephemeral ports — the fix is connection reuse (pooling/keep-alive), not kernel hacks.</li> </ul>"
    }
   ],
   "quiz": [
    {
     "q": "What error does a net.Conn operation return after its deadline passes, and how do you test for it?",
     "a": "An error wrapping os.ErrDeadlineExceeded; check with errors.Is(err, os.ErrDeadlineExceeded) (it also reports Timeout() == true via net.Error)."
    },
    {
     "q": "How do you unblock a goroutine stuck in listener.Accept()?",
     "a": "Close the listener; Accept returns an error matching net.ErrClosed."
    },
    {
     "q": "What happens if a UDP datagram is larger than the buffer passed to ReadFrom?",
     "a": "The excess bytes are silently discarded (truncated); size the buffer for the largest expected datagram."
    },
    {
     "q": "What is the default http.Transport MaxIdleConnsPerHost and why does it matter for proxies?",
     "a": "2. Under concurrency extra connections are closed after use, causing connection churn, TIME_WAIT build-up and ephemeral port exhaustion; raise it for proxies and busy clients."
    },
    {
     "q": "Which ReverseProxy hook should new code use instead of Director, and why?",
     "a": "Rewrite (Go 1.20+). It runs after hop-by-hop header removal, so clients cannot strip proxy-added headers via the Connection header, and it drops client-supplied X-Forwarded-* by default."
    },
    {
     "q": "How does a gRPC client deadline reach the server?",
     "a": "The client context deadline is sent as the grpc-timeout header; the server exposes it as ctx.Deadline(), and cancellation propagates when the client gives up."
    },
    {
     "q": "Which function creates a gRPC client connection in current grpc-go, and does it connect immediately?",
     "a": "grpc.NewClient; it does not connect eagerly — connections are established lazily on the first RPC (grpc.Dial is deprecated)."
    },
    {
     "q": "How do you force the pure-Go DNS resolver?",
     "a": "GODEBUG=netdns=go at runtime, the netgo build tag, or building with CGO_ENABLED=0; or set Resolver.PreferGo = true on a custom resolver."
    }
   ],
   "resources": [
    {
     "title": "Go docs — package net",
     "url": "https://pkg.go.dev/net",
     "type": "docs"
    },
    {
     "title": "Go docs — httputil.ReverseProxy",
     "url": "https://pkg.go.dev/net/http/httputil#ReverseProxy",
     "type": "docs"
    },
    {
     "title": "gRPC — Basics tutorial (Go)",
     "url": "https://grpc.io/docs/languages/go/basics/",
     "type": "docs"
    },
    {
     "title": "Protocol Buffers — Language Guide (proto3)",
     "url": "https://protobuf.dev/programming-guides/proto3/",
     "type": "docs"
    }
   ]
  },
  {
   "n": 10,
   "title": "Security in Go",
   "group": "Cloud-Native Go (Weeks 9–14)",
   "summary": "Secure Go services end to end: TLS and mTLS with crypto/tls, JWT issuance and validation, OAuth2/OIDC login with PKCE, cookies and sessions, RBAC middleware, password hashing and secret handling. Security questions show up in every senior backend loop — usually as \"what can go wrong here?\"",
   "topics": [
    {
     "title": "crypto/tls & HTTPS Servers",
     "def": "Go's <code>crypto/tls</code> is a pure-Go, memory-safe TLS 1.2/1.3 implementation with secure defaults. <ul> <li><strong>Versions</strong> — since Go 1.22 both clients and servers default to a minimum of TLS 1.2. For internal or modern-client APIs set <code>MinVersion: tls.VersionTLS13</code>: 1-RTT handshake, forward secrecy always, encrypted certificates, and only AEAD cipher suites (TLS 1.3 suites are not configurable in Go — by design).</li> <li><strong>Key exchange</strong> — Go 1.24+ enables the post-quantum hybrid <code>X25519MLKEM768</code> by default when <code>CurvePreferences</code> is nil; don't override curves without a reason.</li> <li><strong>Serving</strong> — <code>srv.ListenAndServeTLS(certFile, keyFile)</code>, or pass <code>\"\"</code>/<code>\"\"</code> when certificates come from <code>TLSConfig.Certificates</code> / <code>GetCertificate</code>. HTTP/2 is negotiated automatically via ALPN.</li> <li><strong>Rotation without restart</strong> — <code>GetCertificate</code> is called per handshake; return the current cert from an <code>atomic.Pointer[tls.Certificate]</code> that a watcher swaps when the files (e.g. a cert-manager Secret) change. A failed reload must keep the old cert.</li> <li><strong>autocert</strong> — <code>golang.org/x/crypto/acme/autocert</code> obtains and renews Let's Encrypt certificates (TLS-ALPN-01 / HTTP-01) with a <code>HostPolicy</code> allow-list and a persistent <code>Cache</code>. In Kubernetes, cert-manager usually owns this instead.</li> <li><strong>Hardening</strong> — server timeouts (<code>ReadHeaderTimeout</code> etc.), HSTS header, HTTP→HTTPS redirect, never <code>InsecureSkipVerify</code> in clients (use a proper <code>RootCAs</code> pool).</li> </ul>",
     "interview": "Expect \"walk me through the TLS 1.3 handshake\", \"how do you rotate certificates without downtime\", and \"what does InsecureSkipVerify actually disable\" (all chain and hostname verification — trivial MITM). Know that Go ignores the certificate CN and verifies only SANs, and that TLS 1.3 cipher suites are fixed in Go.",
     "examples": [
      {
       "label": "Hardened HTTPS server (TLS 1.3, timeouts, HSTS, redirect)",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"crypto/tls\"\n    \"log\"\n    \"net\"\n    \"net/http\"\n    \"time\"\n)\n\nfunc main() {\n    mux := http.NewServeMux()\n    mux.HandleFunc(\"GET /\", func(w http.ResponseWriter, r *http.Request) {\n        w.Header().Set(\"Strict-Transport-Security\", \"max-age=63072000; includeSubDomains\")\n        w.Write([]byte(\"hello over \" + tls.VersionName(r.TLS.Version)))\n    })\n\n    srv := &http.Server{\n        Addr:              \":8443\",\n        Handler:           mux,\n        TLSConfig:         &tls.Config{MinVersion: tls.VersionTLS13},\n        ReadHeaderTimeout: 5 * time.Second,\n        ReadTimeout:       15 * time.Second,\n        WriteTimeout:      30 * time.Second,\n        IdleTimeout:       120 * time.Second,\n        MaxHeaderBytes:    1 << 20,\n    }\n\n    // Plain-HTTP listener only redirects to HTTPS.\n    go http.ListenAndServe(\":8080\", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        host, _, err := net.SplitHostPort(r.Host)\n        if err != nil {\n            host = r.Host\n        }\n        http.Redirect(w, r, \"https://\"+host+\":8443\"+r.URL.RequestURI(), http.StatusMovedPermanently)\n    }))\n\n    log.Fatal(srv.ListenAndServeTLS(\"tls.crt\", \"tls.key\"))\n}"
      },
      {
       "label": "Automatic Let's Encrypt certificates with autocert",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"log\"\n    \"net/http\"\n    \"time\"\n\n    \"golang.org/x/crypto/acme/autocert\"\n)\n\nfunc main() {\n    m := &autocert.Manager{\n        Prompt:     autocert.AcceptTOS,\n        HostPolicy: autocert.HostWhitelist(\"api.example.com\"), // never issue for arbitrary SNI\n        Cache:      autocert.DirCache(\"/var/cache/autocert\"),  // persist: CA rate limits!\n    }\n    srv := &http.Server{\n        Addr:              \":443\",\n        Handler:           http.NotFoundHandler(),\n        TLSConfig:         m.TLSConfig(), // GetCertificate + ACME TLS-ALPN-01\n        ReadHeaderTimeout: 5 * time.Second,\n    }\n    go http.ListenAndServe(\":80\", m.HTTPHandler(nil)) // HTTP-01 challenges + redirect\n    log.Fatal(srv.ListenAndServeTLS(\"\", \"\"))\n}"
      }
     ]
    },
    {
     "title": "mTLS for Service-to-Service Authentication",
     "def": "In <strong>mutual TLS</strong> both sides present certificates, giving cryptographic workload identity instead of network-location trust (zero trust). <ul> <li><strong>Server</strong> — <code>ClientAuth: tls.RequireAndVerifyClientCert</code> plus <code>ClientCAs</code> (the pool that client certs must chain to). Weaker modes (<code>RequestClientCert</code>, <code>VerifyClientCertIfGiven</code>) exist for migrations.</li> <li><strong>Client</strong> — <code>Certificates</code> (or <code>GetClientCertificate</code> for rotation) and <code>RootCAs</code> (the pool that the <em>server</em> cert must chain to). Keep the two CA roles distinct.</li> <li><strong>SAN verification</strong> — the client verifies the server name against the certificate's <strong>SANs</strong> (Go has ignored the legacy Common Name since 1.15). Set <code>ServerName</code> when dialing by IP or through a proxy.</li> <li><strong>Authorization</strong> — a valid chain only proves \"signed by our CA\". Authorize the caller by identity in the leaf cert: <code>r.TLS.PeerCertificates[0]</code> URI SANs such as a SPIFFE ID (<code>spiffe://prod.example.com/ns/payments/sa/api</code>) or DNS SANs, checked in middleware or in <code>VerifyConnection</code>.</li> <li><strong>Operations</strong> — short-lived certs (hours) issued by SPIRE, cert-manager or a mesh (Istio/Linkerd do mTLS transparently in sidecars/ambient mode); reload via <code>GetCertificate</code>/<code>GetClientCertificate</code>; monitor expiry (<code>Leaf.NotAfter</code>).</li> </ul>",
     "interview": "Interviewers want the distinction between authentication (valid chain) and authorization (which identity may call which endpoint), how certificates are issued and rotated at scale (SPIFFE/SPIRE, cert-manager, mesh), why short-lived certs beat revocation lists, and when you'd let a service mesh do mTLS instead of the application.",
     "examples": [
      {
       "label": "Server and client tls.Config for mTLS",
       "lang": "go",
       "code": "package mtls\n\nimport (\n    \"crypto/tls\"\n    \"crypto/x509\"\n)\n\n// Server: present our cert, REQUIRE a client cert that chains to clientCAs.\nfunc ServerTLS(cert tls.Certificate, clientCAs *x509.CertPool) *tls.Config {\n    return &tls.Config{\n        MinVersion:   tls.VersionTLS13,\n        Certificates: []tls.Certificate{cert},\n        ClientAuth:   tls.RequireAndVerifyClientCert,\n        ClientCAs:    clientCAs, // trust anchors for CLIENT certs\n    }\n}\n\n// Client: present our cert, verify the server against rootCAs and the expected SAN.\nfunc ClientTLS(cert tls.Certificate, rootCAs *x509.CertPool) *tls.Config {\n    return &tls.Config{\n        MinVersion:   tls.VersionTLS13,\n        Certificates: []tls.Certificate{cert},\n        RootCAs:      rootCAs,                          // trust anchors for SERVER certs\n        ServerName:   \"orders.prod.svc.cluster.local\", // must match a DNS SAN\n    }\n}"
      }
     ]
    },
    {
     "title": "JWT: Issuing and Validating Tokens (golang-jwt/jwt v5)",
     "def": "A <strong>JWT</strong> is <code>base64url(header).base64url(claims).signature</code> — signed, not encrypted, so never put secrets in it. Use <code>github.com/golang-jwt/jwt/v5</code>. <ul> <li><strong>Algorithms</strong> — HS256 (shared secret; only when issuer and verifier are the same service), RS256/ES256/EdDSA (private key signs, public keys verify — the right choice for many services).</li> <li><strong>Algorithm confusion</strong> — the token header chooses the alg. If your key function returns the same key material for any alg, an attacker can switch <code>RS256</code> to <code>HS256</code> and HMAC-sign with your <em>public</em> key, or try <code>alg: none</code>. Always pin with <code>jwt.WithValidMethods([]string{\"RS256\"})</code> and return typed keys (<code>*rsa.PublicKey</code>).</li> <li><strong>Claims</strong> — v5 validates <code>exp</code>/<code>nbf</code>/<code>iat</code> when present, but <code>aud</code> and <code>iss</code> only if you ask: <code>WithAudience</code>, <code>WithIssuer</code>, <code>WithExpirationRequired</code>, <code>WithLeeway</code> for clock skew.</li> <li><strong>Key rotation (JWKS)</strong> — the issuer publishes public keys at a JWKS URL; tokens carry a <code>kid</code> header. Cache keys by kid, refresh periodically and on unknown kid (rate-limited); publish new keys before signing with them and keep old ones until old tokens expire.</li> <li><strong>Access vs refresh tokens</strong> — access tokens are short-lived (5–15 min) JWTs checked statelessly; refresh tokens are long-lived, <em>opaque</em>, stored server-side (hashed), rotated on every use with reuse detection, and revocable.</li> <li><strong>Revocation</strong> — stateless JWTs can't be revoked before <code>exp</code> without state: keep TTLs short, or check a deny-list of <code>jti</code>s / a per-user \"tokens valid after\" timestamp.</li> </ul>",
     "interview": "Classic probes: \"JWT vs server-side sessions\", \"how do you revoke a JWT\", \"what is algorithm confusion and how does your code prevent it\", \"where do you store tokens in a browser\" (HttpOnly cookie vs localStorage and XSS), and \"how does key rotation work without downtime\" (JWKS + kid, overlap window).",
     "examples": [
      {
       "label": "Issue and validate an EdDSA-signed token",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"crypto/ed25519\"\n    \"crypto/rand\"\n    \"fmt\"\n    \"log\"\n    \"time\"\n\n    \"github.com/golang-jwt/jwt/v5\"\n)\n\ntype Claims struct {\n    Roles []string `json:\"roles\"`\n    jwt.RegisteredClaims\n}\n\nfunc main() {\n    pub, priv, err := ed25519.GenerateKey(rand.Reader)\n    if err != nil {\n        log.Fatal(err)\n    }\n\n    now := time.Now()\n    tok := jwt.NewWithClaims(jwt.SigningMethodEdDSA, Claims{\n        Roles: []string{\"orders:read\"},\n        RegisteredClaims: jwt.RegisteredClaims{\n            Issuer:    \"https://auth.example.com\",\n            Subject:   \"user-42\",\n            Audience:  jwt.ClaimStrings{\"orders-api\"},\n            IssuedAt:  jwt.NewNumericDate(now),\n            ExpiresAt: jwt.NewNumericDate(now.Add(10 * time.Minute)),\n            ID:        rand.Text(), // jti, enables deny-listing\n        },\n    })\n    tok.Header[\"kid\"] = \"2026-10-key-1\"\n    signed, err := tok.SignedString(priv)\n    if err != nil {\n        log.Fatal(err)\n    }\n\n    var c Claims\n    _, err = jwt.ParseWithClaims(signed, &c,\n        func(t *jwt.Token) (any, error) { return pub, nil }, // real code: look up t.Header[\"kid\"]\n        jwt.WithValidMethods([]string{\"EdDSA\"}),             // pin the algorithm\n        jwt.WithIssuer(\"https://auth.example.com\"),\n        jwt.WithAudience(\"orders-api\"),\n        jwt.WithExpirationRequired(),\n        jwt.WithLeeway(30*time.Second),\n    )\n    fmt.Println(c.Subject, c.Roles, err)\n}"
      }
     ]
    },
    {
     "title": "OAuth2 & OIDC Clients (x/oauth2, go-oidc)",
     "def": "<strong>OAuth 2</strong> is delegated <em>authorization</em> (access tokens for APIs); <strong>OpenID Connect</strong> adds <em>authentication</em> on top (an ID token proving who logged in). Current best practice (OAuth 2.1 drafts, RFC 9700): <strong>Authorization Code + PKCE</strong> for all clients; implicit and password grants are out. <ol> <li>Login handler generates <code>state</code> (CSRF), <code>nonce</code> (ID-token replay) and a PKCE <code>code_verifier</code>; stores them in short-lived HttpOnly cookies or the server session.</li> <li>Redirect to <code>cfg.AuthCodeURL(state, oidc.Nonce(nonce), oauth2.S256ChallengeOption(verifier))</code>.</li> <li>Callback: compare <code>state</code>; <code>cfg.Exchange(ctx, code, oauth2.VerifierOption(verifier))</code>; extract <code>id_token</code> from <code>tok.Extra(\"id_token\")</code>.</li> <li><code>verifier.Verify(ctx, raw)</code> (go-oidc checks signature via JWKS, <code>iss</code>, <code>aud</code>, <code>exp</code>), then compare the <code>nonce</code> claim.</li> <li>Create your own server-side session (rotate session ID) — don't use the ID token as a session.</li> </ol> <ul> <li><strong>Libraries</strong> — <code>golang.org/x/oauth2</code> (<code>GenerateVerifier</code>, token source with auto-refresh, <code>clientcredentials</code> for service-to-service) and <code>github.com/coreos/go-oidc/v3/oidc</code> (discovery via <code>/.well-known/openid-configuration</code>, ID-token verification).</li> <li><strong>Token roles</strong> — ID token: for the client, audience = client ID. Access token: for the resource server; never accept an ID token as an API credential.</li> </ul>",
     "interview": "Be able to draw the Authorization Code + PKCE flow and explain what each parameter defends against: state (login CSRF), nonce (ID-token replay), PKCE (stolen authorization code), exact redirect URI matching (open redirect/code leakage). Also know client credentials for machine-to-machine and why the implicit flow was deprecated.",
     "examples": [
      {
       "label": "Service-to-service: client credentials with automatic token refresh",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"context\"\n    \"fmt\"\n    \"io\"\n    \"log\"\n    \"os\"\n\n    \"golang.org/x/oauth2/clientcredentials\"\n)\n\nfunc main() {\n    cfg := clientcredentials.Config{\n        ClientID:     os.Getenv(\"CLIENT_ID\"),\n        ClientSecret: os.Getenv(\"CLIENT_SECRET\"), // mount from a secret store\n        TokenURL:     \"https://auth.example.com/oauth2/token\",\n        Scopes:       []string{\"inventory.read\"},\n    }\n    // The returned client caches the access token and fetches a new one before expiry.\n    client := cfg.Client(context.Background())\n    resp, err := client.Get(\"https://inventory.internal.example.com/api/items\")\n    if err != nil {\n        log.Fatal(err)\n    }\n    defer resp.Body.Close()\n    body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))\n    fmt.Println(resp.Status, len(body))\n}"
      }
     ]
    },
    {
     "title": "Sessions, Cookies & CSRF",
     "def": "Browsers attach cookies automatically, which is both convenient and the root of CSRF. <ul> <li><strong>Cookie flags</strong> — <code>HttpOnly</code> (no JS access, blunts XSS token theft), <code>Secure</code> (HTTPS only), <code>SameSite=Lax</code> (not sent on cross-site POSTs/subrequests; <code>Strict</code> also blocks top-level navigation; <code>None</code> requires Secure), short <code>MaxAge</code>. The <code>__Host-</code> prefix forces Secure, <code>Path=/</code> and no Domain, so subdomains can't overwrite it.</li> <li><strong>Server-side sessions</strong> — the cookie holds only a random ID (<code>crypto/rand</code>, ≥128 bits); state lives in Redis/DB. Instant revocation, small cookies; costs a lookup and a shared store across replicas.</li> <li><strong>Stateless tokens</strong> — signed (HMAC) or encrypted cookies/JWTs; no store, but revocation and size are harder.</li> <li><strong>Session hygiene</strong> — regenerate the ID on login and privilege change (session fixation), idle + absolute timeouts, delete server state on logout.</li> <li><strong>CSRF defenses</strong> — SameSite cookies; Go 1.25's <code>http.CrossOriginProtection</code> rejects cross-origin unsafe requests using <code>Sec-Fetch-Site</code>/<code>Origin</code> headers; synchronizer tokens or double-submit cookies for older browsers; never change state on GET.</li> </ul>",
     "interview": "Expect \"cookies vs bearer tokens in a SPA\", \"how does SameSite work and is it enough against CSRF\", \"what is session fixation\", and \"where do you keep session state when you have 20 replicas\". Mentioning Go 1.25's CrossOriginProtection and the __Host- cookie prefix shows you are current.",
     "examples": [
      {
       "label": "Secure session cookie + Go 1.25 CrossOriginProtection",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"crypto/rand\"\n    \"log\"\n    \"net/http\"\n    \"sync\"\n    \"time\"\n)\n\nvar sessions sync.Map // sid -> userID (use Redis in production)\n\nfunc login(w http.ResponseWriter, r *http.Request) {\n    userID := \"user-42\" // ... after verifying credentials\n    sid := rand.Text()  // NEW random ID on every login: prevents session fixation\n    sessions.Store(sid, userID)\n    http.SetCookie(w, &http.Cookie{\n        Name:     \"__Host-sid\", // Secure, Path=/, no Domain\n        Value:    sid,\n        Path:     \"/\",\n        MaxAge:   int((8 * time.Hour).Seconds()),\n        HttpOnly: true,\n        Secure:   true,\n        SameSite: http.SameSiteLaxMode,\n    })\n    w.WriteHeader(http.StatusNoContent)\n}\n\nfunc main() {\n    mux := http.NewServeMux()\n    mux.HandleFunc(\"POST /login\", login)\n\n    csrf := http.NewCrossOriginProtection() // Go 1.25+\n    if err := csrf.AddTrustedOrigin(\"https://admin.example.com\"); err != nil {\n        log.Fatal(err)\n    }\n    srv := &http.Server{Addr: \":8443\", Handler: csrf.Handler(mux), ReadHeaderTimeout: 5 * time.Second}\n    log.Fatal(srv.ListenAndServeTLS(\"tls.crt\", \"tls.key\"))\n}"
      }
     ]
    },
    {
     "title": "Authorization Middleware & RBAC",
     "def": "<strong>Authentication</strong> answers \"who are you?\" (401 when missing/invalid); <strong>authorization</strong> answers \"may you do this?\" (403 when denied). <ul> <li><strong>RBAC</strong> — users get <em>roles</em>, roles map to <em>permissions</em> (<code>orders:read</code>), handlers require permissions — never check role names in handlers, so roles can change without code changes.</li> <li><strong>Middleware design</strong> — an authn middleware validates the credential and stores a <code>Principal</code> in the context under an unexported key type; a <code>Require(perm)</code> middleware wraps individual routes (Go 1.22 patterns like <code>\"POST /orders\"</code> make per-route wrapping clean). Deny by default.</li> <li><strong>Object-level checks</strong> — RBAC says \"can read orders\", not \"can read <em>this</em> order\". Broken Object Level Authorization (BOLA) is #1 in the OWASP API Top 10: check ownership/tenant in the handler or data layer (<code>WHERE tenant_id = $1</code>).</li> <li><strong>Policy engines</strong> — <strong>Casbin</strong> (embedded; model + policy files, RBAC/ABAC, Go native) and <strong>OPA</strong> (Rego policies, run as a sidecar or embedded via the <code>rego</code> package) decouple policy from code and make it auditable; use them when rules get attribute-based or are shared across services.</li> </ul>",
     "interview": "Interviewers check that you separate authn from authz, return 401 vs 403 correctly, avoid string context keys, default to deny, and know RBAC alone doesn't prevent BOLA/IDOR. Be ready to compare RBAC vs ABAC vs ReBAC (Zanzibar-style) and say when you'd reach for OPA or Casbin.",
     "examples": [
      {
       "label": "Casbin RBAC model and policy",
       "lang": "ini",
       "code": "# rbac_model.conf\n[request_definition]\nr = sub, obj, act\n[policy_definition]\np = sub, obj, act\n[role_definition]\ng = _, _\n[policy_effect]\ne = some(where (p.eft == allow))\n[matchers]\nm = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && r.act == p.act\n\n# policy.csv\n# p, editor, /orders/:id, PUT\n# p, viewer, /orders/:id, GET\n# g, alice, editor\n# g, editor, viewer          (role hierarchy)\n\n# Go: e, _ := casbin.NewEnforcer(\"rbac_model.conf\", \"policy.csv\")\n#     ok, err := e.Enforce(\"alice\", \"/orders/42\", \"GET\")"
      }
     ]
    },
    {
     "title": "Password Hashing, Secure Randomness & Secrets",
     "def": "<ul> <li><strong>Passwords</strong> — never store plain or fast hashes (SHA-256 does billions of guesses/s on a GPU). Use a slow, salted KDF: <strong>argon2id</strong> (OWASP first choice; minimum m=19 MiB, t=2, p=1 via <code>golang.org/x/crypto/argon2.IDKey</code>) or <strong>bcrypt</strong> (cost ≥ 10; <code>golang.org/x/crypto/bcrypt</code>; inputs over 72 bytes return <code>ErrPasswordTooLong</code>). Store algorithm + params + salt with the hash so you can re-hash on login when parameters increase.</li> <li><strong>Randomness</strong> — <code>crypto/rand</code> for anything security-relevant (session IDs, tokens, salts, nonces); <code>math/rand</code> is predictable. Go 1.24: <code>rand.Text()</code> returns a 26-char base32 string with ≥128 bits of entropy, and <code>rand.Read</code> never returns an error.</li> <li><strong>Constant-time comparison</strong> — compare MACs, tokens and API-key hashes with <code>hmac.Equal</code> or <code>subtle.ConstantTimeCompare</code>; <code>==</code> / <code>bytes.Equal</code> exit early and leak timing.</li> <li><strong>Secrets handling</strong> — never in source, images or logs. Inject at runtime from a secret store (Vault, AWS Secrets Manager, Azure Key Vault, Kubernetes Secrets via files/CSI driver); prefer mounted files over env vars (env leaks into child processes, crash dumps, <code>/proc/&lt;pid&gt;/environ</code>); implement <code>slog.LogValuer</code> to redact; rotate regularly.</li> <li><strong>Stdlib crypto</strong> — Go 1.24 added <code>crypto/hkdf</code>, <code>crypto/pbkdf2</code>, <code>crypto/sha3</code>, <code>crypto/mlkem</code> and the Go Cryptographic Module for FIPS 140-3: build with <code>GOFIPS140=v1.0.0</code> (or another frozen module version) to select the validated snapshot, run with <code>GODEBUG=fips140=on</code> (or <code>only</code>) to restrict crypto to approved algorithms, and check <code>crypto/fips140.Enabled()</code> at runtime. No cgo or BoringCrypto fork is needed.</li> </ul>",
     "interview": "\"How would you store passwords?\" is near-universal: answer argon2id/bcrypt with per-user salt, tuned cost (~100–250 ms), rehash-on-login, rate limiting and breached-password checks — and explain why fast hashes fail. Follow-ups: timing attacks (constant-time compare, dummy hash for unknown users), crypto/rand vs math/rand, and where secrets live in Kubernetes.",
     "examples": [
      {
       "label": "argon2id hash + constant-time verify",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"crypto/rand\"\n    \"crypto/subtle\"\n    \"fmt\"\n\n    \"golang.org/x/crypto/argon2\"\n)\n\n// OWASP minimum for argon2id: m=19 MiB, t=2, p=1. Tune to ~100-250 ms on your hardware.\nconst (\n    argonTime    = 2\n    argonMemKiB  = 19 * 1024\n    argonThreads = 1\n    keyLen       = 32\n)\n\nfunc hash(password string) (salt, key []byte) {\n    salt = make([]byte, 16)\n    rand.Read(salt) // Go 1.24+: never returns an error\n    key = argon2.IDKey([]byte(password), salt, argonTime, argonMemKiB, argonThreads, keyLen)\n    // Persist as a PHC string: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<key>\n    return salt, key\n}\n\nfunc verify(password string, salt, want []byte) bool {\n    got := argon2.IDKey([]byte(password), salt, argonTime, argonMemKiB, argonThreads, keyLen)\n    return subtle.ConstantTimeCompare(got, want) == 1\n}\n\nfunc main() {\n    salt, key := hash(\"correct horse battery staple\")\n    fmt.Println(verify(\"correct horse battery staple\", salt, key), verify(\"guess\", salt, key))\n}"
      }
     ]
    },
    {
     "title": "Secure Coding: Path Traversal (os.Root), SSRF, Injection & Supply Chain",
     "def": "<p>Most real-world vulnerabilities in Go services come from how they handle <strong>untrusted input</strong> and <strong>dependencies</strong>, not from broken crypto.</p><ul><li><strong>Path traversal</strong>: <code>filepath.Join(base, userPath)</code> happily resolves <code>../../etc/passwd</code>, and lexical checks (<code>filepath.IsLocal</code>, Go 1.20) cannot see symlinks. Go 1.24 added <strong><code>os.Root</code></strong>: open a directory once with <code>os.OpenRoot(dir)</code>, then call <code>root.Open</code>, <code>Create</code> or <code>OpenFile</code>, or use <code>os.OpenInRoot</code> for one-off opens. Every name is resolved relative to that directory, and anything that escapes it is refused, whether through <code>..</code>, an absolute path or a symlink. It resolves names component by component (openat-style), so a symlink swapped in mid-operation cannot redirect it either. Go 1.25 added <code>ReadFile</code>, <code>WriteFile</code>, <code>MkdirAll</code>, <code>Rename</code>, <code>RemoveAll</code>, <code>Symlink</code> and similar methods. <code>root.FS()</code> returns an <code>fs.FS</code> view; <code>os.DirFS</code> does not stop symlink escapes. For zip/tar extraction (\"zip slip\"), reject entry names that fail <code>filepath.IsLocal</code>, or write through an <code>os.Root</code>.</li><li><strong>SSRF</strong>: fetching user-supplied URLs (webhooks, link previews, image import) can reach the <code>169.254.169.254</code> cloud-metadata endpoint, <code>localhost</code> admin ports or cluster-internal services. Checking the hostname before the request is not enough: DNS rebinding returns a different IP at dial time, and the target can redirect to an internal URL. Enforce the policy on the <em>resolved IP at dial time</em> with <code>net.Dialer.Control</code>, cap redirects, set <code>Proxy: nil</code> on that transport, and add an egress proxy or NetworkPolicy as defence in depth.</li><li><strong>Injection</strong>: for SQL, always use placeholders (<code>$1</code>/<code>?</code>) and never <code>fmt.Sprintf</code>; take identifiers such as sort columns from an allow-list. For commands, <code>exec.Command(name, args...)</code> runs no shell, so never build an <code>sh -c</code> string from input. Since Go 1.19, <code>exec.LookPath</code> also refuses binaries found through a relative <code>PATH</code> entry (<code>exec.ErrDot</code>). For HTML, <code>html/template</code> escapes by context; <code>text/template</code> does not escape at all.</li><li><strong>Resource exhaustion</strong>: wrap request bodies in <code>http.MaxBytesReader</code>, set server timeouts, bound decompression (<code>io.LimitReader</code> around gzip readers) and cap message sizes. Go's <code>regexp</code> is RE2-based and runs in linear time, so the catastrophic backtracking behind ReDoS cannot happen, unlike in PCRE-style engines.</li><li><strong>Supply chain</strong>: <code>go.sum</code> hashes are checked against the public checksum database (<code>sum.golang.org</code>); set <code>GOPRIVATE</code> for internal modules. <code>go mod verify</code> re-checks the module cache. Run <strong><code>govulncheck</code></strong> in CI: it joins the Go vulnerability database with call-graph analysis and reports only vulnerabilities whose affected functions your code can actually reach (it can scan binaries too). Pin developer tools in <code>go.mod</code> with Go 1.24 <code>tool</code> directives (<code>go get -tool</code>, then <code>go tool name</code>) instead of <code>@latest</code>. <code>go version -m</code> lists the exact module versions compiled into a binary.</li><li><strong>Fuzzing</strong>: native <code>go test -fuzz</code> (Go 1.18+) is the cheapest way to find panics and parser bugs in code that reads untrusted bytes.</li></ul>",
     "interview": "Expect OWASP-style questions about Go code: how you would stop path traversal (os.Root, filepath.IsLocal), why an SSRF filter must check the resolved IP at dial time (DNS rebinding, redirects, the metadata endpoint), how database/sql placeholders prevent SQL injection, and how you secure dependencies (go.sum and the checksum database, govulncheck reachability analysis, tool directives). Naming os.Root (Go 1.24) and govulncheck shows practical, current knowledge.",
     "examples": [
      {
       "label": "Serve user-named files safely with os.Root (Go 1.24+)",
       "lang": "go",
       "code": "package files\n\nimport (\n    \"io\"\n    \"net/http\"\n    \"os\"\n)\n\n// Handler serves GET /files/{name...} from dir. os.Root refuses names that\n// escape dir, whether via \"../\", absolute paths or symlinks pointing outside.\nfunc Handler(dir string) (http.Handler, error) {\n    root, err := os.OpenRoot(dir) // keep it open for the process lifetime\n    if err != nil {\n        return nil, err\n    }\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        f, err := root.Open(r.PathValue(\"name\"))\n        if err != nil {\n            http.NotFound(w, r) // escaping, missing or forbidden: same answer\n            return\n        }\n        defer f.Close()\n        w.Header().Set(\"Content-Type\", \"application/octet-stream\")\n        io.Copy(w, f)\n    }), nil\n}\n\n// mux.Handle(\"GET /files/{name...}\", h)"
      },
      {
       "label": "Supply-chain hygiene: govulncheck, tool directives, verification",
       "lang": "bash",
       "code": "# Reachability-aware vulnerability scan of source and of a built binary\ngo run golang.org/x/vuln/cmd/govulncheck@latest ./...\ngo run golang.org/x/vuln/cmd/govulncheck@latest -mode=binary ./bin/api\n\n# Go 1.24+: pin dev tools in go.mod instead of \"go install ...@latest\"\ngo get -tool golang.org/x/vuln/cmd/govulncheck\ngo tool govulncheck ./...\n\n# Integrity and inventory\ngo mod verify                 # module cache still matches go.sum\ngo version -m ./bin/api       # module versions embedded in the binary"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Hash and verify passwords with bcrypt (timing-safe login)",
     "d": "easy",
     "type": "coding",
     "hint": "<ul> <li><code>bcrypt.GenerateFromPassword(pw, cost)</code> embeds salt and cost in the hash string.</li> <li><code>bcrypt.CompareHashAndPassword</code> is already constant-time for the comparison.</li> <li>When the user does not exist, still run a comparison against a dummy hash so response time doesn't reveal valid usernames.</li> <li>Return one generic error; use <code>bcrypt.Cost</code> to detect hashes that need upgrading.</li> </ul>",
     "lang": "go",
     "solution": "package auth\n\nimport (\n    \"errors\"\n\n    \"golang.org/x/crypto/bcrypt\"\n)\n\nconst cost = 12 // bcrypt.DefaultCost is 10; re-tune as hardware gets faster\n\nvar ErrInvalidCredentials = errors.New(\"invalid credentials\")\n\n// dummyHash burns the same CPU time when the user doesn't exist (no user enumeration).\nvar dummyHash, _ = bcrypt.GenerateFromPassword([]byte(\"dummy-password\"), cost)\n\nfunc HashPassword(pw string) (string, error) {\n    // Inputs over 72 bytes return bcrypt.ErrPasswordTooLong — enforce a max length upstream.\n    h, err := bcrypt.GenerateFromPassword([]byte(pw), cost)\n    return string(h), err\n}\n\n// Verify checks a login attempt. needsRehash reports a hash created with an older, lower cost.\nfunc Verify(storedHash string, userExists bool, pw string) (needsRehash bool, err error) {\n    if !userExists {\n        bcrypt.CompareHashAndPassword(dummyHash, []byte(pw))\n        return false, ErrInvalidCredentials\n    }\n    if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(pw)); err != nil {\n        return false, ErrInvalidCredentials // don't reveal which part failed\n    }\n    c, err := bcrypt.Cost([]byte(storedHash))\n    return err == nil && c < cost, nil\n}"
    },
    {
     "t": "Generate API keys and verify them in constant time",
     "d": "easy",
     "type": "coding",
     "hint": "<ul> <li>Generate keys with <code>crypto/rand</code> (<code>rand.Text()</code> in Go 1.24+); add a recognisable prefix (helps secret scanners).</li> <li>Store only a hash. A fast hash (SHA-256) is fine because keys are high-entropy random — unlike passwords.</li> <li>Compare with <code>subtle.ConstantTimeCompare</code>; respond 401 with <code>WWW-Authenticate</code>.</li> <li>Show the plaintext key exactly once at creation time.</li> </ul>",
     "lang": "go",
     "solution": "package apikey\n\nimport (\n    \"crypto/rand\"\n    \"crypto/sha256\"\n    \"crypto/subtle\"\n    \"encoding/hex\"\n    \"net/http\"\n    \"strings\"\n)\n\n// New returns the plaintext key (show once) and the hash to persist.\nfunc New() (plain, stored string) {\n    plain = \"sk_live_\" + rand.Text() // >=128 bits from crypto/rand\n    sum := sha256.Sum256([]byte(plain))\n    return plain, hex.EncodeToString(sum[:])\n}\n\nfunc Matches(plain, stored string) bool {\n    sum := sha256.Sum256([]byte(plain))\n    got := hex.EncodeToString(sum[:])\n    return subtle.ConstantTimeCompare([]byte(got), []byte(stored)) == 1\n}\n\n// RequireKey guards a handler with a key whose hash comes from a mounted secret.\nfunc RequireKey(storedHash string, next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        key, ok := strings.CutPrefix(r.Header.Get(\"Authorization\"), \"Bearer \")\n        if !ok || !Matches(key, storedHash) {\n            w.Header().Set(\"WWW-Authenticate\", \"Bearer\")\n            http.Error(w, \"unauthorized\", http.StatusUnauthorized)\n            return\n        }\n        next.ServeHTTP(w, r)\n    })\n}"
    },
    {
     "t": "Tamper-proof session cookie with HMAC signing and expiry",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Cookie value = <code>base64url(payload) \".\" base64url(HMAC-SHA256(key, payload))</code>; payload includes an expiry timestamp.</li> <li>Verify with <code>hmac.Equal</code> (constant time) <em>before</em> trusting any field.</li> <li>Flags: <code>HttpOnly</code>, <code>Secure</code>, <code>SameSite=Lax</code>, <code>__Host-</code> prefix.</li> <li>Signed ≠ encrypted: the payload is readable. For key rotation, try a list of keys (newest first).</li> <li>Trade-off vs server-side sessions: no lookup, but no instant revocation.</li> </ul>",
     "lang": "go",
     "solution": "package session\n\nimport (\n    \"crypto/hmac\"\n    \"crypto/sha256\"\n    \"encoding/base64\"\n    \"errors\"\n    \"net/http\"\n    \"strconv\"\n    \"strings\"\n    \"time\"\n)\n\nconst cookieName = \"__Host-session\"\n\nvar ErrInvalid = errors.New(\"invalid session\")\n\ntype Signer struct{ Key []byte } // >= 32 random bytes from a secret store\n\nfunc (s Signer) mac(payload []byte) []byte {\n    m := hmac.New(sha256.New, s.Key)\n    m.Write(payload)\n    return m.Sum(nil)\n}\n\n// Set writes \"userID|expiryUnix\" plus its MAC. Signed (tamper-proof), not encrypted.\nfunc (s Signer) Set(w http.ResponseWriter, userID string, ttl time.Duration) {\n    payload := []byte(userID + \"|\" + strconv.FormatInt(time.Now().Add(ttl).Unix(), 10))\n    enc := base64.RawURLEncoding\n    http.SetCookie(w, &http.Cookie{\n        Name:     cookieName,\n        Value:    enc.EncodeToString(payload) + \".\" + enc.EncodeToString(s.mac(payload)),\n        Path:     \"/\",\n        MaxAge:   int(ttl.Seconds()),\n        HttpOnly: true,\n        Secure:   true,\n        SameSite: http.SameSiteLaxMode,\n    })\n}\n\n// UserID returns the authenticated user or ErrInvalid.\nfunc (s Signer) UserID(r *http.Request) (string, error) {\n    c, err := r.Cookie(cookieName)\n    if err != nil {\n        return \"\", ErrInvalid\n    }\n    p64, sig64, ok := strings.Cut(c.Value, \".\")\n    if !ok {\n        return \"\", ErrInvalid\n    }\n    enc := base64.RawURLEncoding\n    payload, err1 := enc.DecodeString(p64)\n    sig, err2 := enc.DecodeString(sig64)\n    if err1 != nil || err2 != nil || !hmac.Equal(sig, s.mac(payload)) {\n        return \"\", ErrInvalid // verify BEFORE parsing anything\n    }\n    i := strings.LastIndexByte(string(payload), '|')\n    if i < 0 {\n        return \"\", ErrInvalid\n    }\n    exp, err := strconv.ParseInt(string(payload[i+1:]), 10, 64)\n    if err != nil || time.Now().Unix() > exp {\n        return \"\", ErrInvalid\n    }\n    return string(payload[:i]), nil\n}"
    },
    {
     "t": "RBAC middleware: roles to permissions with per-route checks",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Model <code>Permission</code> constants and a role → permission-set map; handlers depend on permissions, not role names.</li> <li>Authn middleware puts a <code>*Principal</code> in the context under an unexported key type.</li> <li><code>Require(perm)</code> returns middleware: 401 if no principal, 403 if not permitted, deny by default.</li> <li>Wrap routes individually using Go 1.22 method patterns; object-level checks (ownership/tenant) still belong in the handler.</li> </ul>",
     "lang": "go",
     "solution": "package rbac\n\nimport (\n    \"context\"\n    \"net/http\"\n)\n\ntype Permission string\n\nconst (\n    OrdersRead  Permission = \"orders:read\"\n    OrdersWrite Permission = \"orders:write\"\n    UsersAdmin  Permission = \"users:admin\"\n)\n\nvar rolePerms = map[string]map[Permission]bool{\n    \"viewer\": {OrdersRead: true},\n    \"editor\": {OrdersRead: true, OrdersWrite: true},\n    \"admin\":  {OrdersRead: true, OrdersWrite: true, UsersAdmin: true},\n}\n\ntype Principal struct {\n    Subject string\n    Tenant  string\n    Roles   []string\n}\n\nfunc (p *Principal) Can(perm Permission) bool {\n    for _, role := range p.Roles {\n        if rolePerms[role][perm] {\n            return true\n        }\n    }\n    return false // deny by default (unknown roles grant nothing)\n}\n\ntype ctxKey struct{} // unexported: no collisions with other packages\n\nfunc WithPrincipal(ctx context.Context, p *Principal) context.Context {\n    return context.WithValue(ctx, ctxKey{}, p)\n}\n\nfunc PrincipalFrom(ctx context.Context) (*Principal, bool) {\n    p, ok := ctx.Value(ctxKey{}).(*Principal)\n    return p, ok\n}\n\n// Require must run after the authentication middleware.\nfunc Require(perm Permission) func(http.Handler) http.Handler {\n    return func(next http.Handler) http.Handler {\n        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n            p, ok := PrincipalFrom(r.Context())\n            if !ok {\n                http.Error(w, \"unauthenticated\", http.StatusUnauthorized) // who are you?\n                return\n            }\n            if !p.Can(perm) {\n                http.Error(w, \"forbidden\", http.StatusForbidden) // known, but not allowed\n                return\n            }\n            next.ServeHTTP(w, r)\n        })\n    }\n}\n\nfunc Routes(getOrder, createOrder, deleteUser http.Handler) *http.ServeMux {\n    mux := http.NewServeMux()\n    mux.Handle(\"GET /orders/{id}\", Require(OrdersRead)(getOrder)) // handler still checks tenant ownership\n    mux.Handle(\"POST /orders\", Require(OrdersWrite)(createOrder))\n    mux.Handle(\"DELETE /users/{id}\", Require(UsersAdmin)(deleteUser))\n    return mux\n}"
    },
    {
     "t": "JWT authentication middleware with kid-based key lookup",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Extract <code>Authorization: Bearer &lt;token&gt;</code> with <code>strings.CutPrefix</code>.</li> <li>Build one <code>jwt.NewParser</code> with <code>WithValidMethods</code>, <code>WithIssuer</code>, <code>WithAudience</code>, <code>WithExpirationRequired</code>, <code>WithLeeway</code>.</li> <li>The key func looks up the <code>kid</code> header in a key set refreshed from the IdP's JWKS (RWMutex or atomic pointer).</li> <li>On failure return 401 with <code>WWW-Authenticate: Bearer error=\"invalid_token\"</code>; don't leak details.</li> <li>Put validated claims in the request context for downstream authz.</li> </ul>",
     "lang": "go",
     "solution": "package jwtauth\n\nimport (\n    \"context\"\n    \"crypto/rsa\"\n    \"errors\"\n    \"fmt\"\n    \"net/http\"\n    \"strings\"\n    \"sync\"\n    \"time\"\n\n    \"github.com/golang-jwt/jwt/v5\"\n)\n\ntype Claims struct {\n    Scope string `json:\"scope\"`\n    jwt.RegisteredClaims\n}\n\n// KeySet holds RSA public keys by kid; a background job refreshes it from the JWKS URL.\ntype KeySet struct {\n    mu   sync.RWMutex\n    keys map[string]*rsa.PublicKey\n}\n\nfunc (ks *KeySet) Replace(keys map[string]*rsa.PublicKey) {\n    ks.mu.Lock()\n    ks.keys = keys\n    ks.mu.Unlock()\n}\n\nfunc (ks *KeySet) keyFunc(t *jwt.Token) (any, error) {\n    kid, _ := t.Header[\"kid\"].(string)\n    ks.mu.RLock()\n    defer ks.mu.RUnlock()\n    if k, ok := ks.keys[kid]; ok {\n        return k, nil // typed *rsa.PublicKey, never raw bytes\n    }\n    return nil, fmt.Errorf(\"unknown kid %q\", kid) // trigger a rate-limited JWKS refresh\n}\n\ntype ctxKey struct{}\n\nfunc ClaimsFrom(ctx context.Context) (*Claims, bool) {\n    c, ok := ctx.Value(ctxKey{}).(*Claims)\n    return c, ok\n}\n\nfunc Middleware(ks *KeySet, issuer, audience string, next http.Handler) http.Handler {\n    parser := jwt.NewParser(\n        jwt.WithValidMethods([]string{\"RS256\"}), // defeats alg=none and HS256 confusion\n        jwt.WithIssuer(issuer),\n        jwt.WithAudience(audience),\n        jwt.WithExpirationRequired(),\n        jwt.WithIssuedAt(),\n        jwt.WithLeeway(30*time.Second),\n    )\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        raw, ok := strings.CutPrefix(r.Header.Get(\"Authorization\"), \"Bearer \")\n        if !ok {\n            unauthorized(w, \"missing bearer token\")\n            return\n        }\n        var c Claims\n        if _, err := parser.ParseWithClaims(raw, &c, ks.keyFunc); err != nil {\n            if errors.Is(err, jwt.ErrTokenExpired) {\n                unauthorized(w, \"token expired\")\n                return\n            }\n            unauthorized(w, \"invalid token\")\n            return\n        }\n        next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, &c)))\n    })\n}\n\nfunc unauthorized(w http.ResponseWriter, msg string) {\n    w.Header().Set(\"WWW-Authenticate\", `Bearer error=\"invalid_token\"`)\n    http.Error(w, msg, http.StatusUnauthorized)\n}"
    },
    {
     "t": "Debug: JWT algorithm-confusion and missing claim checks",
     "d": "medium",
     "type": "debug",
     "hint": "The service verifies tokens with: <code>jwt.Parse(raw, func(t *jwt.Token) (any, error) { return pubPEM, nil })</code> where <code>pubPEM</code> is the RSA public key as <code>[]byte</code>. Find the vulnerabilities: <ul> <li>An attacker sets <code>alg: HS256</code> and HMAC-signs with the (public!) PEM bytes — the library accepts a <code>[]byte</code> key for HMAC.</li> <li>No <code>aud</code>/<code>iss</code> check — tokens minted for another service are accepted.</li> <li><code>exp</code> is optional — a token without it never expires.</li> <li>Fix: pin methods, return a typed <code>*rsa.PublicKey</code>, require exp, check aud/iss.</li> </ul>",
     "lang": "go",
     "solution": "package verify\n\nimport (\n    \"crypto/rsa\"\n    \"fmt\"\n\n    \"github.com/golang-jwt/jwt/v5\"\n)\n\n// VULNERABLE:\n//   tok, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) { return pubPEM, nil })\n//\n// FIXED:\nfunc Parse(raw string, pub *rsa.PublicKey) (*jwt.RegisteredClaims, error) {\n    var c jwt.RegisteredClaims\n    _, err := jwt.ParseWithClaims(raw, &c,\n        func(t *jwt.Token) (any, error) {\n            // Defense in depth on top of WithValidMethods.\n            if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {\n                return nil, fmt.Errorf(\"unexpected signing method %v\", t.Header[\"alg\"])\n            }\n            return pub, nil // typed key: an HS256 token can never verify against it\n        },\n        jwt.WithValidMethods([]string{\"RS256\"}),\n        jwt.WithIssuer(\"https://auth.example.com\"),\n        jwt.WithAudience(\"billing-api\"),\n        jwt.WithExpirationRequired(),\n    )\n    if err != nil {\n        return nil, err\n    }\n    return &c, nil\n}"
    },
    {
     "t": "Hot-reload TLS certificates without restarting the server",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Hold the current <code>*tls.Certificate</code> in an <code>atomic.Pointer</code>; serve it from <code>GetCertificate</code> (called on every handshake).</li> <li>Poll the cert file's mtime (robust with Kubernetes Secret symlink swaps) or reload on SIGHUP.</li> <li>If parsing the new pair fails, log and keep the old certificate — never take the server down.</li> <li>Fail fast at startup if the initial load fails; expose <code>Leaf.NotAfter</code> as a metric for expiry alerts.</li> </ul>",
     "lang": "go",
     "solution": "package certs\n\nimport (\n    \"context\"\n    \"crypto/tls\"\n    \"log/slog\"\n    \"os\"\n    \"sync/atomic\"\n    \"time\"\n)\n\n// Reloader always serves the latest VALID key pair.\ntype Reloader struct {\n    certFile, keyFile string\n    cur               atomic.Pointer[tls.Certificate]\n    modTime           time.Time // only touched by New and Watch\n}\n\nfunc NewReloader(certFile, keyFile string) (*Reloader, error) {\n    r := &Reloader{certFile: certFile, keyFile: keyFile}\n    fi, err := os.Stat(certFile)\n    if err != nil {\n        return nil, err\n    }\n    if err := r.load(); err != nil {\n        return nil, err // fail fast at startup\n    }\n    r.modTime = fi.ModTime()\n    return r, nil\n}\n\nfunc (r *Reloader) load() error {\n    c, err := tls.LoadX509KeyPair(r.certFile, r.keyFile) // Go 1.23+ also fills c.Leaf\n    if err != nil {\n        return err\n    }\n    r.cur.Store(&c)\n    return nil\n}\n\n// Watch polls the certificate's mtime and reloads when it changes.\nfunc (r *Reloader) Watch(ctx context.Context, every time.Duration) {\n    t := time.NewTicker(every)\n    defer t.Stop()\n    for {\n        select {\n        case <-ctx.Done():\n            return\n        case <-t.C:\n        }\n        fi, err := os.Stat(r.certFile)\n        if err != nil || !fi.ModTime().After(r.modTime) {\n            continue\n        }\n        if err := r.load(); err != nil {\n            slog.Error(\"cert reload failed; keeping previous certificate\", \"err\", err)\n            continue\n        }\n        r.modTime = fi.ModTime()\n        slog.Info(\"certificate reloaded\", \"notAfter\", r.cur.Load().Leaf.NotAfter)\n    }\n}\n\nfunc (r *Reloader) GetCertificate(*tls.ClientHelloInfo) (*tls.Certificate, error) {\n    return r.cur.Load(), nil\n}\n\nfunc (r *Reloader) TLSConfig() *tls.Config {\n    return &tls.Config{MinVersion: tls.VersionTLS13, GetCertificate: r.GetCertificate}\n}"
    },
    {
     "t": "mTLS between services with SPIFFE-ID authorization",
     "d": "hard",
     "type": "coding",
     "hint": "<ul> <li>Server: <code>RequireAndVerifyClientCert</code> + <code>ClientCAs</code>. Client: <code>Certificates</code> + <code>RootCAs</code> + <code>ServerName</code>.</li> <li>Chain validation = authentication only. Authorize by the URI SAN (SPIFFE ID) of <code>r.TLS.PeerCertificates[0]</code> against an allow-list.</li> <li>On the client, <code>VerifyConnection</code> runs after standard verification — use it to pin the expected server identity.</li> <li>401 when there's no client cert (only possible with weaker ClientAuth modes), 403 for a valid but disallowed identity.</li> <li>Mention rotation via <code>GetCertificate</code>/<code>GetClientCertificate</code> and SPIRE's Workload API.</li> </ul>",
     "lang": "go",
     "solution": "package mtls\n\nimport (\n    \"crypto/tls\"\n    \"crypto/x509\"\n    \"errors\"\n    \"fmt\"\n    \"net/http\"\n    \"os\"\n    \"slices\"\n)\n\nfunc loadPool(path string) (*x509.CertPool, error) {\n    pem, err := os.ReadFile(path)\n    if err != nil {\n        return nil, err\n    }\n    pool := x509.NewCertPool()\n    if !pool.AppendCertsFromPEM(pem) {\n        return nil, errors.New(\"no certificates found in \" + path)\n    }\n    return pool, nil\n}\n\nfunc spiffeID(c *x509.Certificate) string {\n    for _, u := range c.URIs {\n        if u.Scheme == \"spiffe\" {\n            return u.String()\n        }\n    }\n    return \"\"\n}\n\n// ServerConfig presents our cert and REQUIRES a client cert chained to clientCAFile.\nfunc ServerConfig(certFile, keyFile, clientCAFile string) (*tls.Config, error) {\n    cert, err := tls.LoadX509KeyPair(certFile, keyFile)\n    if err != nil {\n        return nil, err\n    }\n    pool, err := loadPool(clientCAFile)\n    if err != nil {\n        return nil, err\n    }\n    return &tls.Config{\n        MinVersion:   tls.VersionTLS13,\n        Certificates: []tls.Certificate{cert},\n        ClientAuth:   tls.RequireAndVerifyClientCert,\n        ClientCAs:    pool,\n    }, nil\n}\n\n// ClientConfig verifies the server chain + DNS SAN, then pins its SPIFFE ID.\nfunc ClientConfig(certFile, keyFile, serverCAFile, serverName, wantServerID string) (*tls.Config, error) {\n    cert, err := tls.LoadX509KeyPair(certFile, keyFile)\n    if err != nil {\n        return nil, err\n    }\n    pool, err := loadPool(serverCAFile)\n    if err != nil {\n        return nil, err\n    }\n    return &tls.Config{\n        MinVersion:   tls.VersionTLS13,\n        Certificates: []tls.Certificate{cert},\n        RootCAs:      pool,\n        ServerName:   serverName,\n        VerifyConnection: func(cs tls.ConnectionState) error { // runs after chain + hostname checks\n            if id := spiffeID(cs.PeerCertificates[0]); id != wantServerID {\n                return fmt.Errorf(\"unexpected server identity %q\", id)\n            }\n            return nil\n        },\n    }, nil\n}\n\n// RequireCaller authorizes by workload identity, not merely \"has a cert from our CA\".\nfunc RequireCaller(allowed []string, next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        if r.TLS == nil || len(r.TLS.PeerCertificates) == 0 {\n            http.Error(w, \"client certificate required\", http.StatusUnauthorized)\n            return\n        }\n        id := spiffeID(r.TLS.PeerCertificates[0])\n        if id == \"\" || !slices.Contains(allowed, id) {\n            http.Error(w, \"caller not allowed\", http.StatusForbidden)\n            return\n        }\n        next.ServeHTTP(w, r)\n    })\n}\n\n// Usage:\n//   cfg, _ := ServerConfig(\"tls.crt\", \"tls.key\", \"clients-ca.crt\")\n//   h := RequireCaller([]string{\"spiffe://prod.example.com/ns/web/sa/frontend\"}, api)\n//   srv := &http.Server{Addr: \":8443\", Handler: h, TLSConfig: cfg}\n//   srv.ListenAndServeTLS(\"\", \"\")"
    },
    {
     "t": "OIDC login with Authorization Code + PKCE, state and nonce",
     "d": "hard",
     "type": "coding",
     "hint": "<ul> <li><code>oidc.NewProvider</code> (discovery) → <code>provider.Endpoint()</code> for <code>oauth2.Config</code>, <code>provider.Verifier(&amp;oidc.Config{ClientID})</code>.</li> <li>/login: random <code>state</code>, <code>nonce</code>, <code>oauth2.GenerateVerifier()</code> in short-lived HttpOnly cookies (SameSite=Lax so they survive the IdP redirect back).</li> <li>/callback: check state → <code>Exchange</code> with <code>VerifierOption</code> → verify <code>id_token</code> → check nonce → read claims.</li> <li>Then create your own server-side session (new ID) and delete the temporary cookies.</li> </ul>",
     "lang": "go",
     "solution": "package main\n\nimport (\n    \"context\"\n    \"crypto/rand\"\n    \"crypto/subtle\"\n    \"log\"\n    \"net/http\"\n    \"os\"\n    \"time\"\n\n    \"github.com/coreos/go-oidc/v3/oidc\"\n    \"golang.org/x/oauth2\"\n)\n\ntype app struct {\n    oauth    *oauth2.Config\n    verifier *oidc.IDTokenVerifier\n}\n\nfunc newApp(ctx context.Context) (*app, error) {\n    provider, err := oidc.NewProvider(ctx, \"https://accounts.google.com\") // discovery document\n    if err != nil {\n        return nil, err\n    }\n    cfg := &oauth2.Config{\n        ClientID:     os.Getenv(\"OIDC_CLIENT_ID\"),\n        ClientSecret: os.Getenv(\"OIDC_CLIENT_SECRET\"),\n        RedirectURL:  \"https://app.example.com/callback\", // must match exactly at the IdP\n        Endpoint:     provider.Endpoint(),\n        Scopes:       []string{oidc.ScopeOpenID, \"profile\", \"email\"},\n    }\n    return &app{oauth: cfg, verifier: provider.Verifier(&oidc.Config{ClientID: cfg.ClientID})}, nil\n}\n\nfunc setTemp(w http.ResponseWriter, name, value string, maxAge int) {\n    http.SetCookie(w, &http.Cookie{Name: name, Value: value, Path: \"/callback\", MaxAge: maxAge,\n        HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})\n}\n\nfunc cookieEquals(r *http.Request, name, want string) bool {\n    c, err := r.Cookie(name)\n    return err == nil && want != \"\" && subtle.ConstantTimeCompare([]byte(c.Value), []byte(want)) == 1\n}\n\nfunc (a *app) login(w http.ResponseWriter, r *http.Request) {\n    state, nonce, verifier := rand.Text(), rand.Text(), oauth2.GenerateVerifier()\n    setTemp(w, \"oidc_state\", state, 300)\n    setTemp(w, \"oidc_nonce\", nonce, 300)\n    setTemp(w, \"oidc_pkce\", verifier, 300)\n    url := a.oauth.AuthCodeURL(state, oidc.Nonce(nonce), oauth2.S256ChallengeOption(verifier))\n    http.Redirect(w, r, url, http.StatusFound)\n}\n\nfunc (a *app) callback(w http.ResponseWriter, r *http.Request) {\n    if !cookieEquals(r, \"oidc_state\", r.URL.Query().Get(\"state\")) { // login CSRF\n        http.Error(w, \"invalid state\", http.StatusBadRequest)\n        return\n    }\n    pkce, err := r.Cookie(\"oidc_pkce\")\n    if err != nil {\n        http.Error(w, \"missing PKCE verifier\", http.StatusBadRequest)\n        return\n    }\n    ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)\n    defer cancel()\n\n    tok, err := a.oauth.Exchange(ctx, r.URL.Query().Get(\"code\"), oauth2.VerifierOption(pkce.Value))\n    if err != nil {\n        http.Error(w, \"code exchange failed\", http.StatusBadGateway)\n        return\n    }\n    rawID, ok := tok.Extra(\"id_token\").(string)\n    if !ok {\n        http.Error(w, \"no id_token\", http.StatusBadGateway)\n        return\n    }\n    idt, err := a.verifier.Verify(ctx, rawID) // signature (JWKS), iss, aud, exp\n    if err != nil || !cookieEquals(r, \"oidc_nonce\", idt.Nonce) { // replay protection\n        http.Error(w, \"invalid id_token\", http.StatusUnauthorized)\n        return\n    }\n    var claims struct {\n        Email         string `json:\"email\"`\n        EmailVerified bool   `json:\"email_verified\"`\n    }\n    if err := idt.Claims(&claims); err != nil {\n        http.Error(w, \"bad claims\", http.StatusUnauthorized)\n        return\n    }\n    for _, n := range []string{\"oidc_state\", \"oidc_nonce\", \"oidc_pkce\"} {\n        setTemp(w, n, \"\", -1) // delete temp cookies\n    }\n    // Create a server-side session keyed by a fresh random ID (see sessions topic).\n    log.Printf(\"login ok: sub=%s email=%s verified=%t\", idt.Subject, claims.Email, claims.EmailVerified)\n    http.Redirect(w, r, \"/\", http.StatusFound)\n}\n\nfunc main() {\n    a, err := newApp(context.Background())\n    if err != nil {\n        log.Fatal(err)\n    }\n    mux := http.NewServeMux()\n    mux.HandleFunc(\"GET /login\", a.login)\n    mux.HandleFunc(\"GET /callback\", a.callback)\n    srv := &http.Server{Addr: \":8443\", Handler: mux, ReadHeaderTimeout: 5 * time.Second}\n    log.Fatal(srv.ListenAndServeTLS(\"tls.crt\", \"tls.key\"))\n}"
    },
    {
     "t": "Refresh-token rotation with reuse detection",
     "d": "hard",
     "type": "coding",
     "hint": "<ul> <li>Refresh tokens are opaque random strings; persist only their SHA-256 with user, <em>family</em> ID, expiry and a <code>used</code> flag.</li> <li>On refresh: valid + unused → mark used, issue a new token in the same family (plus a new short-lived access JWT).</li> <li>An already-used token was stolen (attacker or victim used it first) → revoke the whole family, forcing re-login.</li> <li>Do the check-and-mark atomically (mutex here; <code>UPDATE ... WHERE used = false</code> or a Redis Lua script in production).</li> <li>Consider a few-seconds grace window for legitimate concurrent refreshes (two browser tabs).</li> </ul>",
     "lang": "go",
     "solution": "package tokens\n\nimport (\n    \"crypto/rand\"\n    \"crypto/sha256\"\n    \"errors\"\n    \"sync\"\n    \"time\"\n)\n\nvar (\n    ErrInvalid = errors.New(\"invalid refresh token\")\n    ErrReuse   = errors.New(\"refresh token reuse detected; session revoked\")\n)\n\ntype record struct {\n    family  string\n    userID  string\n    used    bool\n    expires time.Time\n}\n\ntype Store struct {\n    mu      sync.Mutex\n    byHash  map[[32]byte]*record\n    revoked map[string]bool // family -> revoked\n    ttl     time.Duration\n}\n\nfunc NewStore(ttl time.Duration) *Store {\n    return &Store{byHash: map[[32]byte]*record{}, revoked: map[string]bool{}, ttl: ttl}\n}\n\n// Issue starts a new family at login (family == \"\") or continues one on rotation.\nfunc (s *Store) Issue(userID, family string) string {\n    tok := rand.Text()\n    if family == \"\" {\n        family = rand.Text()\n    }\n    s.mu.Lock()\n    defer s.mu.Unlock()\n    s.byHash[sha256.Sum256([]byte(tok))] = &record{family: family, userID: userID, expires: time.Now().Add(s.ttl)}\n    return tok\n}\n\n// Rotate validates tok, marks it used and returns its successor.\nfunc (s *Store) Rotate(tok string) (next, userID string, err error) {\n    s.mu.Lock()\n    rec, ok := s.byHash[sha256.Sum256([]byte(tok))]\n    switch {\n    case !ok || s.revoked[rec.family] || time.Now().After(rec.expires):\n        s.mu.Unlock()\n        return \"\", \"\", ErrInvalid\n    case rec.used:\n        s.revoked[rec.family] = true // theft signal: kill every token in the family\n        s.mu.Unlock()\n        return \"\", \"\", ErrReuse\n    }\n    rec.used = true\n    s.mu.Unlock()\n    return s.Issue(rec.userID, rec.family), rec.userID, nil\n}\n\n// Logout revokes the family of the presented token.\nfunc (s *Store) Logout(tok string) {\n    s.mu.Lock()\n    defer s.mu.Unlock()\n    if rec, ok := s.byHash[sha256.Sum256([]byte(tok))]; ok {\n        s.revoked[rec.family] = true\n    }\n}"
    },
    {
     "t": "SSRF-safe HTTP client for user-supplied webhook URLs",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>Targets to block: cloud metadata (<code>169.254.169.254</code>), <code>localhost</code> admin ports, RFC 1918 and cluster-internal addresses, and IPv4-mapped IPv6 tricks (<code>::ffff:10.0.0.1</code>).</li><li>Checking the hostname before the request is not enough: DNS can answer differently at dial time (rebinding), and the target can redirect to an internal URL.</li><li>Put the check in <code>net.Dialer.Control</code>. It receives the resolved <code>ip:port</code> for every connection attempt, including redirect hops and Happy Eyeballs fallbacks.</li><li>Use the <code>netip.Addr</code> helpers (<code>Unmap</code>, <code>IsGlobalUnicast</code>, <code>IsPrivate</code>) and allow only ports 80 and 443. Disable the proxy on this transport, and cap redirects, timeouts and header size.</li><li>Test with <code>httptest.NewServer</code>: the loopback request must be refused. Keep a network-level egress policy as a second layer.</li></ul>",
     "lang": "go",
     "solution": "package safehttp\n\nimport (\n    \"errors\"\n    \"fmt\"\n    \"net\"\n    \"net/http\"\n    \"net/netip\"\n    \"syscall\"\n    \"time\"\n)\n\nvar ErrBlocked = errors.New(\"destination not allowed\")\n\n// allowed rejects loopback, private (RFC 1918, fc00::/7), link-local (incl.\n// 169.254.169.254 cloud metadata), multicast and unspecified addresses.\nfunc allowed(ip netip.Addr) bool {\n    ip = ip.Unmap() // ::ffff:10.0.0.1 is still 10.0.0.1\n    return ip.IsGlobalUnicast() && !ip.IsPrivate()\n}\n\n// NewClient returns a client for user-supplied URLs (webhooks, link previews).\n// The check runs in Dialer.Control, i.e. on the IP actually being dialled,\n// after DNS resolution and for every redirect hop, so DNS rebinding and\n// redirects to internal hosts cannot bypass it.\nfunc NewClient() *http.Client {\n    d := &net.Dialer{\n        Timeout: 5 * time.Second,\n        Control: func(network, address string, _ syscall.RawConn) error {\n            ap, err := netip.ParseAddrPort(address)\n            if err != nil {\n                return err\n            }\n            if !allowed(ap.Addr()) || (ap.Port() != 80 && ap.Port() != 443) {\n                return fmt.Errorf(\"%w: %s\", ErrBlocked, address)\n            }\n            return nil\n        },\n    }\n    tr := &http.Transport{\n        Proxy:                  nil, // an egress proxy would dial on our behalf and skip the check\n        DialContext:            d.DialContext,\n        TLSHandshakeTimeout:    5 * time.Second,\n        ResponseHeaderTimeout:  10 * time.Second,\n        MaxResponseHeaderBytes: 64 << 10,\n    }\n    return &http.Client{\n        Transport: tr,\n        Timeout:   15 * time.Second,\n        CheckRedirect: func(req *http.Request, via []*http.Request) error {\n            if len(via) >= 3 {\n                return errors.New(\"stopped after 3 redirects\")\n            }\n            return nil // each hop is dialled through the same Control check\n        },\n    }\n}\n\n// safehttp_test.go:\n//\n// func TestBlocksInternal(t *testing.T) {\n//     srv := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))\n//     defer srv.Close()\n//     for _, u := range []string{srv.URL, \"http://169.254.169.254/latest/meta-data/\", \"http://[::1]/\", \"http://10.1.2.3/\"} {\n//         if _, err := NewClient().Get(u); !errors.Is(err, ErrBlocked) {\n//             t.Errorf(\"%s: want ErrBlocked, got %v\", u, err)\n//         }\n//     }\n// }\n//\n// Callers should still read responses through io.LimitReader."
    }
   ],
   "interviewFocus": [
    {
     "q": "Walk through a TLS 1.3 handshake and what you configure in Go.",
     "a": "<ol> <li><strong>ClientHello</strong>: supported versions, cipher suites, key shares (e.g. X25519 or the hybrid X25519MLKEM768), SNI, ALPN (<code>h2</code>, <code>http/1.1</code>).</li> <li><strong>ServerHello</strong>: picks a suite and key share → both derive handshake keys (ECDHE, forward secret). Everything after is encrypted.</li> <li>Server sends <strong>EncryptedExtensions</strong>, <strong>Certificate</strong>, <strong>CertificateVerify</strong> (signature over the transcript proving key possession), <strong>Finished</strong>. With mTLS it also sends <strong>CertificateRequest</strong>.</li> <li>Client verifies the chain to a trusted root, the SAN against the server name, the signature; sends Finished (plus its cert for mTLS). Application data flows after <strong>1 RTT</strong> (0-RTT resumption exists but is replayable; Go's server doesn't accept 0-RTT data).</li> </ol> In Go: <code>MinVersion</code>, certificates via <code>Certificates</code>/<code>GetCertificate</code>, <code>ClientAuth</code>/<code>ClientCAs</code> for mTLS, <code>RootCAs</code>/<code>ServerName</code> on clients. You can't choose TLS 1.3 cipher suites; leave <code>CurvePreferences</code> nil to get post-quantum hybrid key exchange (Go 1.24+)."
    },
    {
     "q": "JWTs vs server-side sessions: which would you choose and how do you revoke a JWT?",
     "a": "<table><thead><tr><th></th><th>Server-side session</th><th>Stateless JWT</th></tr></thead><tbody> <tr><td>Validation</td><td>Store lookup (Redis)</td><td>Signature check, no I/O</td></tr> <tr><td>Revocation</td><td>Instant (delete)</td><td>Hard until exp</td></tr> <tr><td>Size</td><td>Small cookie</td><td>Grows with claims</td></tr> <tr><td>Best for</td><td>Browser apps, one domain</td><td>Service-to-service, many verifiers</td></tr> </tbody></table> Common hybrid: browser ↔ BFF uses an HttpOnly session cookie; the BFF/gateway exchanges it for short-lived access JWTs for internal APIs. Revoking JWTs: short TTL (5–15 min) + refresh-token revocation (the user loses access at next refresh); a deny-list of <code>jti</code>s with TTL = remaining lifetime; a per-user \"tokens issued before T are invalid\" timestamp; rotating the signing key as a last resort (revokes everyone)."
    },
    {
     "q": "Explain the OAuth2 Authorization Code flow with PKCE and the purpose of state and nonce.",
     "a": "<ol> <li>Client creates <code>code_verifier</code> (random) and <code>code_challenge = BASE64URL(SHA256(verifier))</code>, plus <code>state</code> and (OIDC) <code>nonce</code>, bound to the user's browser session.</li> <li>Redirects to the authorization endpoint with client_id, redirect_uri, scope, state, nonce, code_challenge, method S256.</li> <li>User authenticates and consents; IdP redirects back with <code>code</code> and <code>state</code>.</li> <li>Client checks state, then POSTs code + <code>code_verifier</code> (+ client secret for confidential clients) to the token endpoint; IdP verifies SHA256(verifier) == challenge.</li> <li>Receives access token, optional refresh token and ID token; validates the ID token and its nonce.</li> </ol> <strong>state</strong> prevents login CSRF (attacker injecting their own code into your session). <strong>PKCE</strong> makes an intercepted authorization code useless without the verifier (mobile/SPA, and now recommended for every client). <strong>nonce</strong> binds the ID token to this login and blocks replay. Exact redirect-URI matching prevents code leakage to attacker URLs."
    },
    {
     "q": "How would you secure service-to-service communication in a Kubernetes microservice platform?",
     "a": "<ul> <li><strong>Transport + identity</strong>: mTLS everywhere with short-lived workload certs (SPIFFE IDs via SPIRE or a service mesh). Prefer the mesh for uniformity; in-app <code>crypto/tls</code> when you need identity-aware logic or there's no mesh.</li> <li><strong>Authorization</strong>: per-service allow-lists by identity (mesh AuthorizationPolicy or middleware checking the peer's SPIFFE ID); end-user context propagated as a signed JWT (audience-restricted per service) so downstream services can enforce user-level permissions.</li> <li><strong>Network</strong>: Kubernetes NetworkPolicies default-deny as defence in depth.</li> <li><strong>Secrets</strong>: no long-lived shared secrets; cloud workload identity (IRSA / Azure Workload Identity) for cloud APIs; secrets mounted from Vault/CSI, rotated.</li> <li><strong>Operations</strong>: cert expiry metrics and alerts, audit logs of authz decisions, rotation drills.</li> </ul>"
    },
    {
     "q": "How do you store passwords correctly, and what timing attacks should a Go login handler defend against?",
     "a": "<ul> <li>Hash with <strong>argon2id</strong> (memory-hard; resists GPU/ASIC) or <strong>bcrypt</strong>; unique random salt per password; parameters tuned to ~100–250 ms; store algorithm + params in the hash string and <em>rehash on successful login</em> when parameters change.</li> <li>Never SHA-256/MD5 (fast, GPU-friendly) and never encrypt passwords (reversible).</li> <li>Optional <strong>pepper</strong>: an HMAC key held outside the DB (KMS), applied before hashing.</li> <li><strong>Timing</strong>: compare secrets with <code>subtle.ConstantTimeCompare</code>/<code>hmac.Equal</code>; for unknown users still run a dummy hash so latency doesn't reveal which usernames exist; return one generic error.</li> <li>Surrounding controls: rate limiting/lockout with backoff per account and IP, breached-password checks, MFA, and never log credentials.</li> </ul>"
    },
    {
     "q": "How do you keep a Go service's dependency and build supply chain secure?",
     "a": "<ul><li><strong>Integrity</strong>: <code>go.sum</code> pins the hash of every module zip and <code>go.mod</code>. A first download is checked against <code>sum.golang.org</code>, a public transparency log, so a tampered or re-tagged version fails the build. Use <code>GOPROXY</code> (the public proxy or an internal mirror) for availability, and <code>GOPRIVATE</code> for internal modules.</li><li><strong>Explicit upgrades</strong>: minimal version selection never pulls in a newer dependency silently. Upgrades are <code>go get</code> commits you can review in a diff (Dependabot/Renovate).</li><li><strong>Vulnerabilities</strong>: run <code>govulncheck</code> in CI and against released binaries. Reachability analysis keeps alerts actionable. Keep the toolchain current too: the <code>go</code>/<code>toolchain</code> lines in <code>go.mod</code> pin a known Go version, and <code>GOTOOLCHAIN</code> downloads are checksum-verified.</li><li><strong>Tools</strong>: Go 1.24 <code>tool</code> directives pin linters and generators in <code>go.mod</code> (<code>go get -tool</code>, <code>go tool name</code>), so every developer and CI run uses the same versions.</li><li><strong>Provenance</strong>: build reproducibly (<code>-trimpath</code>; the Go toolchain itself builds reproducibly). Use <code>go version -m</code> as an embedded SBOM, sign images (cosign) and publish SLSA provenance.</li><li><strong>Attack surface</strong>: prefer the standard library, vet new dependencies (maintenance, size of the transitive tree via <code>go mod graph</code>) and watch for typosquatted module paths.</li></ul>"
    }
   ],
   "quiz": [
    {
     "q": "What is the default minimum TLS version for Go servers since Go 1.22?",
     "a": "TLS 1.2 (for both clients and servers); set MinVersion: tls.VersionTLS13 to require 1.3."
    },
    {
     "q": "Which tls.Config field makes a server require and verify client certificates, and which field holds the CAs used to verify them?",
     "a": "ClientAuth: tls.RequireAndVerifyClientCert, with ClientCAs holding the trusted client CA pool."
    },
    {
     "q": "Which golang-jwt v5 parser option prevents algorithm-confusion attacks?",
     "a": "jwt.WithValidMethods([]string{...}) to pin accepted algorithms (plus returning a correctly typed key from the key func)."
    },
    {
     "q": "What does PKCE protect against?",
     "a": "Interception of the authorization code: without the original code_verifier the stolen code cannot be exchanged for tokens."
    },
    {
     "q": "What does the __Host- cookie prefix enforce?",
     "a": "The cookie must be Secure, have Path=/ and no Domain attribute, so it is bound to the exact host and cannot be set by subdomains."
    },
    {
     "q": "What does Go 1.25 http.CrossOriginProtection do?",
     "a": "It rejects non-safe (e.g. POST) cross-origin browser requests using the Sec-Fetch-Site and Origin headers, providing CSRF protection without tokens."
    },
    {
     "q": "Why is SHA-256 a bad password hash?",
     "a": "It is fast and unsalted by default, so attackers can test billions of guesses per second on GPUs; use a slow, salted, memory-hard KDF like argon2id or bcrypt."
    },
    {
     "q": "What does crypto/rand.Text() return (Go 1.24+)?",
     "a": "A cryptographically random 26-character base32 string with at least 128 bits of entropy — suitable for session IDs and tokens."
    },
    {
     "q": "What does os.Root (Go 1.24) protect against that filepath.Join plus a string-prefix check does not?",
     "a": "Escapes resolved at open time, especially through symlinks. Every operation is confined to the root directory, so \"../\" names, absolute paths and symlinks pointing outside it are refused, whereas a lexical check only inspects the string."
    },
    {
     "q": "Why is validating a URL's hostname before fetching it not enough to prevent SSRF?",
     "a": "The name can resolve to an internal IP when the connection is made (DNS rebinding), and the server can redirect to an internal URL. Check the resolved IP at dial time (net.Dialer.Control), which also runs for every redirect hop."
    },
    {
     "q": "How does govulncheck differ from a plain dependency-version scanner?",
     "a": "It combines the Go vulnerability database with call-graph analysis and reports only vulnerabilities whose affected functions your code can actually reach, which cuts false positives. It can also scan compiled binaries."
    }
   ],
   "resources": [
    {
     "title": "Go docs — crypto/tls",
     "url": "https://pkg.go.dev/crypto/tls",
     "type": "docs"
    },
    {
     "title": "golang-jwt/jwt v5 documentation",
     "url": "https://pkg.go.dev/github.com/golang-jwt/jwt/v5",
     "type": "docs"
    },
    {
     "title": "OWASP Password Storage Cheat Sheet",
     "url": "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
     "type": "article"
    },
    {
     "title": "RFC 9700 — Best Current Practice for OAuth 2.0 Security",
     "url": "https://datatracker.ietf.org/doc/html/rfc9700",
     "type": "docs"
    },
    {
     "title": "Go docs: os.Root (traversal-resistant file access)",
     "url": "https://pkg.go.dev/os#Root",
     "type": "docs"
    },
    {
     "title": "Tutorial: Find and fix vulnerable dependencies with govulncheck",
     "url": "https://go.dev/doc/tutorial/govulncheck",
     "type": "docs"
    }
   ]
  },
  {
   "n": 11,
   "title": "Cloud-Native Go Services",
   "group": "Cloud-Native Go (Weeks 9–14)",
   "summary": "Turn a Go binary into a production cloud-native service: 12-factor configuration, small secure container images, probes and graceful shutdown on Kubernetes, container-aware runtime tuning (GOMAXPROCS, GOMEMLIMIT), observability with slog/Prometheus/OpenTelemetry, resilience patterns, and scaling. This is the \"you build it, you run it\" material senior interviews dig into.",
   "topics": [
    {
     "title": "12-Factor Apps & Configuration",
     "def": "The <strong>12-factor</strong> methodology keeps services portable and disposable: one codebase, explicit dependencies (<code>go.mod</code>), <strong>config in the environment</strong>, backing services as attached resources, stateless processes, port binding, fast startup + graceful shutdown, logs as event streams to stdout, dev/prod parity. <ul> <li><strong>Config struct</strong> — load once at startup into a typed struct, validate everything and <em>fail fast</em> with all errors (<code>errors.Join</code>); pass the struct (or parts) explicitly — no global <code>os.Getenv</code> calls scattered through the code.</li> <li><strong>Precedence</strong> — defaults &lt; environment &lt; flags is a common, predictable order; <code>flag.NewFlagSet</code> + <code>os.LookupEnv</code> are enough for most services (<code>caarlos0/env</code>, <code>kelseyhightower/envconfig</code> or <code>spf13/viper</code> if you need more).</li> <li><strong>Types</strong> — parse durations with <code>time.ParseDuration</code>, levels with <code>slog.Level.UnmarshalText</code>; reject unknown values rather than silently defaulting.</li> <li><strong>Secrets injection</strong> — keep secrets out of images and Git; inject at runtime from Kubernetes Secrets, Vault, or a cloud secret manager. Prefer mounted files (rotatable, not inherited by child processes, not visible in <code>/proc/&lt;pid&gt;/environ</code>), support a <code>NAME_FILE</code> convention, and redact secrets in logs via <code>slog.LogValuer</code>.</li> <li><strong>Build info</strong>: read <code>runtime/debug.ReadBuildInfo()</code>. The toolchain stamps <code>vcs.revision</code>, <code>vcs.time</code> and <code>vcs.modified</code>, and since Go 1.24 <code>Main.Version</code> comes from the Git tag (or a pseudo-version) instead of <code>(devel)</code>. <code>-ldflags \"-X main.version=...\"</code> still helps when you build outside a VCS checkout, such as a Docker context without <code>.git</code>. Log it at startup and expose it as a <code>build_info</code> metric.</li> </ul>",
     "interview": "Interviewers ask how you manage config across environments, how secrets reach the process, and what happens on a bad config (fail fast at startup → CrashLoopBackOff visible immediately, instead of failing on the first request). Mention config validation, immutable config per deploy, and secret rotation without restarts (file watch).",
     "examples": [
      {
       "label": "Secrets from mounted files with env fallback",
       "lang": "go",
       "code": "package config\n\nimport (\n    \"fmt\"\n    \"os\"\n    \"strings\"\n)\n\n// Secret reads NAME_FILE (a mounted Kubernetes Secret / CSI volume) first, then NAME.\n// Files are rotatable and don't leak into child processes or /proc/<pid>/environ.\nfunc Secret(name string) (string, error) {\n    if path, ok := os.LookupEnv(name + \"_FILE\"); ok {\n        b, err := os.ReadFile(path)\n        if err != nil {\n            return \"\", fmt.Errorf(\"read %s: %w\", name, err)\n        }\n        return strings.TrimSpace(string(b)), nil\n    }\n    if v, ok := os.LookupEnv(name); ok && v != \"\" {\n        return v, nil\n    }\n    return \"\", fmt.Errorf(\"secret %s is not set\", name)\n}"
      },
      {
       "label": "Kubernetes: config from a ConfigMap, secret as a file",
       "lang": "yaml",
       "code": "containers:\n- name: api\n  image: ghcr.io/acme/orders-api:1.4.2\n  envFrom:\n  - configMapRef: {name: orders-api-config}     # LOG_LEVEL, SHUTDOWN_TIMEOUT, ...\n  env:\n  - name: DB_PASSWORD_FILE\n    value: /var/run/secrets/db/password\n  volumeMounts:\n  - name: db-secret\n    mountPath: /var/run/secrets/db\n    readOnly: true\nvolumes:\n- name: db-secret\n  secret: {secretName: orders-db}"
      }
     ]
    },
    {
     "title": "Containerizing Go Services",
     "def": "Go compiles to a single binary, so production images can be tiny. <ul> <li><strong>Multi-stage build</strong> — compile in a pinned <code>golang:1.26</code> image (keep it on a supported Go release), copy only the binary into the runtime stage. Copy <code>go.mod</code>/<code>go.sum</code> and run <code>go mod download</code> first so the dependency layer is cached; BuildKit cache mounts (<code>--mount=type=cache</code>) persist the module and build caches.</li> <li><strong>Static binaries</strong> — <code>CGO_ENABLED=0</code> produces a binary with no libc dependency (also forces the pure-Go DNS resolver). <code>-trimpath</code> for reproducibility, <code>-ldflags=\"-s -w\"</code> to strip symbol tables/DWARF (smaller; stack traces still work).</li> <li><strong>Base images</strong> — <code>gcr.io/distroless/static</code> (CA certs, tzdata, <code>/etc/passwd</code> with a <code>nonroot</code> user, no shell) or <code>scratch</code> (truly empty: copy CA certs yourself, embed tzdata with <code>import _ \"time/tzdata\"</code>). Result: ~10–25 MB images with a minimal CVE surface.</li> <li><strong>Non-root</strong> — <code>USER 65532</code> / <code>nonroot</code>; in Kubernetes add <code>runAsNonRoot</code>, <code>readOnlyRootFilesystem</code>, <code>allowPrivilegeEscalation: false</code>, drop all capabilities. Listen on ports &gt; 1024.</li> <li><strong>Multi-arch</strong> — cross-compile natively with <code>--platform=$BUILDPLATFORM</code> and <code>GOOS=$TARGETOS GOARCH=$TARGETARCH</code> (no QEMU emulation needed).</li> <li><strong>ko</strong> — builds and pushes images straight from a Go main package onto a minimal static base, no Dockerfile; great for Kubernetes controllers and simple services.</li> </ul>",
     "interview": "Be ready to write a multi-stage Dockerfile from memory and justify each line: layer caching, CGO and static linking, why distroless/scratch, what breaks on scratch (TLS without CA certs, time zones, no shell for debugging — use kubectl debug ephemeral containers), non-root, and image scanning/signing (Trivy, cosign).",
     "examples": [
      {
       "label": "ko and build flags",
       "lang": "bash",
       "code": "# Static, stripped, reproducible binary with an embedded version\nCGO_ENABLED=0 GOOS=linux GOARCH=arm64 \\\n  go build -trimpath -ldflags=\"-s -w -X main.version=1.4.2\" -o server ./cmd/server\n\n# ko: build + push a multi-arch image from the main package, no Dockerfile\nKO_DOCKER_REPO=ghcr.io/acme ko build ./cmd/server --platform=linux/amd64,linux/arm64\n\n# Debug a distroless pod (no shell inside) with an ephemeral container\nkubectl debug -it pod/orders-api-7c9d -n prod --image=busybox:1.36 --target=api"
      }
     ]
    },
    {
     "title": "Probes, Health Checks & Graceful Shutdown",
     "def": "Kubernetes probes answer different questions — mixing them up causes outages. <ul> <li><strong>Liveness</strong> — \"is the process wedged?\" Failure ⇒ restart. Keep it trivial; <em>never</em> check dependencies here, or a database blip restarts every pod at once.</li> <li><strong>Readiness</strong> — \"should I receive traffic now?\" Failure ⇒ removed from Service endpoints, not restarted. Fail during warm-up, when critical dependencies are unavailable, and while draining.</li> <li><strong>Startup</strong> — gives slow-starting apps time (liveness/readiness are paused until it succeeds).</li> </ul> <strong>Termination sequence</strong>: the pod is marked Terminating; in parallel the kubelet runs the <code>preStop</code> hook then sends <strong>SIGTERM</strong>, while the endpoints controller removes the pod from Services — that propagation to kube-proxy/ingress takes a few seconds, so requests can still arrive after SIGTERM. After <code>terminationGracePeriodSeconds</code> (default 30 s) comes SIGKILL. <ul> <li>Catch signals with <code>signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)</code>.</li> <li>Delay a few seconds (a <code>preStop</code> sleep — native <code>sleep</code> action in Kubernetes 1.30+, which works in distroless images with no <code>sleep</code> binary — or an in-app sleep after failing readiness).</li> <li><code>http.Server.Shutdown(ctx)</code> closes listeners, closes idle keep-alive connections and waits for active requests; give it a budget below the grace period. It does not wait for hijacked connections (WebSockets) — use <code>RegisterOnShutdown</code>.</li> <li>Then stop background workers and consumers, flush telemetry, close DB pools — in reverse dependency order.</li> </ul>",
     "interview": "\"How do you achieve zero-downtime deploys?\" is the classic: explain the SIGTERM vs endpoint-removal race, preStop delay, readiness flip, Shutdown with a timeout, grace period sizing, PodDisruptionBudgets and rolling update maxUnavailable/maxSurge. Also: why liveness must not check dependencies.",
     "examples": [
      {
       "label": "Minimal graceful shutdown with readiness flip",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"context\"\n    \"errors\"\n    \"log\"\n    \"net/http\"\n    \"os\"\n    \"os/signal\"\n    \"sync/atomic\"\n    \"syscall\"\n    \"time\"\n)\n\nfunc main() {\n    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)\n    defer stop()\n\n    var ready atomic.Bool\n    mux := http.NewServeMux()\n    mux.HandleFunc(\"GET /livez\", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })\n    mux.HandleFunc(\"GET /readyz\", func(w http.ResponseWriter, _ *http.Request) {\n        if !ready.Load() {\n            http.Error(w, \"not ready\", http.StatusServiceUnavailable)\n            return\n        }\n        w.WriteHeader(http.StatusOK)\n    })\n    srv := &http.Server{Addr: \":8080\", Handler: mux, ReadHeaderTimeout: 5 * time.Second}\n\n    go func() {\n        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {\n            log.Fatal(err)\n        }\n    }()\n    ready.Store(true)\n\n    <-ctx.Done() // SIGTERM from the kubelet\n    stop()       // a second signal now kills immediately\n    ready.Store(false)\n    time.Sleep(5 * time.Second) // endpoint removal propagates (skip if preStop sleeps)\n\n    shCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second) // < grace period\n    defer cancel()\n    if err := srv.Shutdown(shCtx); err != nil {\n        log.Print(\"forced shutdown: \", err)\n    }\n}"
      },
      {
       "label": "Pod spec: probes, preStop sleep, grace period",
       "lang": "yaml",
       "code": "spec:\n  terminationGracePeriodSeconds: 30\n  containers:\n  - name: api\n    image: ghcr.io/acme/orders-api:1.4.2\n    ports: [{containerPort: 8080}]\n    startupProbe:\n      httpGet: {path: /livez, port: 8080}\n      periodSeconds: 2\n      failureThreshold: 30        # up to 60s to start\n    livenessProbe:\n      httpGet: {path: /livez, port: 8080}\n      periodSeconds: 10\n      failureThreshold: 3\n    readinessProbe:\n      httpGet: {path: /readyz, port: 8080}\n      periodSeconds: 5\n      failureThreshold: 1\n    lifecycle:\n      preStop:\n        sleep: {seconds: 5}       # native sleep action (K8s 1.30+), no shell needed"
      }
     ]
    },
    {
     "title": "Go Runtime in Containers: GOMAXPROCS & GOMEMLIMIT",
     "def": "Containers limit CPU and memory through cgroups; the Go runtime has to cooperate. <ul> <li><strong>GOMAXPROCS before Go 1.25</strong> — defaulted to the number of host CPUs. A pod with a 2-CPU limit on a 64-core node ran 64 Ps; the CFS quota was exhausted early in each 100 ms period and the container was <strong>throttled</strong>, causing tail-latency spikes. The fix was <code>go.uber.org/automaxprocs</code> or setting <code>GOMAXPROCS</code> explicitly.</li> <li><strong>Go 1.25+</strong> — on Linux the default GOMAXPROCS respects the cgroup <strong>CPU limit</strong>: if the limit is lower than the CPU count, GOMAXPROCS defaults to the limit rounded up, with a minimum of 2 (so a <code>500m</code> limit still gives 2), and the runtime periodically re-checks and adjusts it if the limit changes (e.g. in-place pod resize). It applies only when the module's <code>go</code> directive is ≥ 1.25 and <code>GOMAXPROCS</code> isn't set explicitly (<code>GODEBUG=containermaxprocs=0</code> / <code>updatemaxprocs=0</code> to opt out). CPU <em>requests</em> are not considered — with no limit you still get the node's CPU count.</li> <li><strong>GOMEMLIMIT</strong> (Go 1.19+) — a <em>soft</em> memory limit for the GC. Go does <strong>not</strong> derive it from the cgroup automatically. Without it, the heap can grow to ~2× the live heap (GOGC=100) and cross the container limit → the kernel OOM-kills the pod (<code>OOMKilled</code>, exit 137). Set it to ~85–90% of the memory limit, leaving room for goroutine stacks, cgo and OS overhead.</li> <li><strong>Death spiral</strong> — if the live heap genuinely exceeds GOMEMLIMIT, the GC runs continuously; the runtime caps GC CPU at ~50% to avoid total stalls, but you still need to fix the leak or raise the limit. Some teams combine <code>GOMEMLIMIT</code> with <code>GOGC=off</code> for predictable, limit-driven GC.</li> <li><strong>Inspect</strong> — <code>runtime.GOMAXPROCS(0)</code> (and <code>runtime.SetDefaultGOMAXPROCS()</code>, Go 1.25, to go back to the automatic value after something overrode it), <code>debug.SetMemoryLimit(-1)</code> (reads the current value), <code>GODEBUG=gctrace=1</code>, <code>/sched/gomaxprocs:threads</code> in <code>runtime/metrics</code>, and <code>container_cpu_cfs_throttled_periods_total</code> in Prometheus.</li> </ul>",
     "interview": "A favourite senior question: \"Our Go service in Kubernetes has p99 spikes and occasional OOMKills — why?\" Talk about CFS throttling from a GOMAXPROCS/limit mismatch (and the Go 1.25 fix), GOMEMLIMIT vs the container limit, GOGC trade-offs, how to read throttling and memory metrics, and that requests vs limits matter differently for CPU (compressible) and memory (incompressible).",
     "examples": [
      {
       "label": "Set GOMEMLIMIT to 90% of the cgroup v2 memory limit at startup",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"log/slog\"\n    \"os\"\n    \"runtime\"\n    \"runtime/debug\"\n    \"strconv\"\n    \"strings\"\n)\n\n// setMemLimit respects an explicit GOMEMLIMIT; otherwise derives one from cgroup v2.\nfunc setMemLimit() {\n    if os.Getenv(\"GOMEMLIMIT\") != \"\" {\n        return\n    }\n    b, err := os.ReadFile(\"/sys/fs/cgroup/memory.max\")\n    if err != nil {\n        return // not cgroup v2 or not in a container\n    }\n    s := strings.TrimSpace(string(b))\n    if s == \"max\" {\n        return // no memory limit\n    }\n    limit, err := strconv.ParseInt(s, 10, 64)\n    if err != nil {\n        return\n    }\n    debug.SetMemoryLimit(limit / 10 * 9) // leave ~10% for stacks, cgo, OS\n}\n\nfunc main() {\n    setMemLimit()\n    slog.Info(\"runtime\",\n        \"GOMAXPROCS\", runtime.GOMAXPROCS(0), // cgroup-aware by default in Go 1.25+\n        \"GOMEMLIMIT\", debug.SetMemoryLimit(-1), // -1 reads without changing\n        \"NumCPU\", runtime.NumCPU())\n}"
      },
      {
       "label": "Resources + explicit GOMEMLIMIT in the pod spec",
       "lang": "yaml",
       "code": "resources:\n  requests: {cpu: \"500m\", memory: 512Mi}\n  limits:   {cpu: \"2\", memory: 512Mi}    # Go 1.25+: GOMAXPROCS defaults to 2 here\nenv:\n- name: GOMEMLIMIT                        # soft GC target, ~90% of the memory limit\n  value: \"460MiB\"\n# Downward API alternative (100% of the limit, no headroom):\n# - name: GOMEMLIMIT\n#   valueFrom: {resourceFieldRef: {resource: limits.memory}}"
      }
     ]
    },
    {
     "title": "Observability: slog, Prometheus Metrics, OpenTelemetry Tracing",
     "def": "The three pillars answer different questions: <strong>metrics</strong> (is something wrong? cheap, aggregated), <strong>traces</strong> (where in the call graph?), <strong>logs</strong> (what exactly happened?). Correlate them through the request context. <ul> <li><strong>log/slog</strong> (Go 1.21+) — structured, levelled logging: <code>slog.NewJSONHandler</code> to stdout, <code>logger.With(\"service\", ...)</code> for common attrs, <code>slog.InfoContext(ctx, ...)</code> so handlers can add trace IDs, <code>LogValuer</code> to redact secrets. Log events, not every request at INFO in hot paths.</li> <li><strong>Prometheus</strong> (<code>client_golang</code>) — <strong>RED</strong> for services: Rate (<code>http_requests_total</code> counter), Errors (status label), Duration (<code>http_request_duration_seconds</code> histogram). <strong>USE</strong> (utilisation, saturation, errors) for resources. Expose <code>promhttp.Handler()</code> on <code>/metrics</code>; Go runtime and process collectors come for free. Keep label <strong>cardinality</strong> bounded — route templates, never raw paths, user IDs or arbitrary methods.</li> <li><strong>OpenTelemetry</strong> — vendor-neutral API/SDK: a <code>TracerProvider</code> with an OTLP exporter and batch span processor, <code>otelhttp.NewHandler</code> for inbound and <code>otelhttp.NewTransport</code> for outbound HTTP, <code>otelgrpc</code> stats handlers for gRPC. Context propagation uses the W3C <code>traceparent</code> header — always pass <code>ctx</code> through. Sample (e.g. parent-based ratio) to control cost, and shut the provider down on exit to flush spans.</li> <li><strong>SLOs</strong> — alert on symptoms (error-rate and latency SLO burn rates) rather than causes; profiling (<code>net/http/pprof</code>, continuous profiling) completes the picture.</li> </ul>",
     "interview": "Expect \"how would you instrument a new service\", \"what is RED vs USE\", \"why are histograms better than averages / how do you get p99\", \"what is high cardinality and why does it hurt Prometheus\", and \"how does a trace ID flow from the gateway through gRPC and Kafka to the database call\" (context propagation via headers/metadata).",
     "examples": [
      {
       "label": "slog JSON logs + OpenTelemetry tracing with otelhttp",
       "lang": "go",
       "code": "package main\n\nimport (\n    \"context\"\n    \"log\"\n    \"log/slog\"\n    \"net/http\"\n    \"os\"\n    \"time\"\n\n    \"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp\"\n    \"go.opentelemetry.io/otel\"\n    \"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc\"\n    \"go.opentelemetry.io/otel/propagation\"\n    sdktrace \"go.opentelemetry.io/otel/sdk/trace\"\n    \"go.opentelemetry.io/otel/trace\"\n)\n\nfunc main() {\n    ctx := context.Background()\n    slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))\n\n    exp, err := otlptracegrpc.New(ctx) // endpoint from OTEL_EXPORTER_OTLP_ENDPOINT\n    if err != nil {\n        log.Fatal(err)\n    }\n    tp := sdktrace.NewTracerProvider( // service name from OTEL_SERVICE_NAME\n        sdktrace.WithBatcher(exp),\n        sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))),\n    )\n    defer tp.Shutdown(ctx) // flush spans on exit\n    otel.SetTracerProvider(tp)\n    otel.SetTextMapPropagator(propagation.TraceContext{}) // W3C traceparent\n\n    // Outbound calls carry the trace context when made with r.Context().\n    client := &http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport), Timeout: 5 * time.Second}\n    _ = client\n\n    mux := http.NewServeMux()\n    mux.HandleFunc(\"GET /orders/{id}\", func(w http.ResponseWriter, r *http.Request) {\n        sc := trace.SpanContextFromContext(r.Context())\n        slog.InfoContext(r.Context(), \"get order\", \"id\", r.PathValue(\"id\"), \"trace_id\", sc.TraceID().String())\n        w.Write([]byte(\"ok\"))\n    })\n    srv := &http.Server{Addr: \":8080\", Handler: otelhttp.NewHandler(mux, \"http.server\"), ReadHeaderTimeout: 5 * time.Second}\n    log.Fatal(srv.ListenAndServe())\n}"
      }
     ]
    },
    {
     "title": "Resilience: Timeouts, Retries, Circuit Breakers, Rate Limits, Idempotency",
     "def": "In a distributed system every call can be slow or fail; resilience patterns keep partial failures from becoming outages. <ul> <li><strong>Timeouts everywhere</strong> — server: <code>ReadHeaderTimeout</code>, <code>ReadTimeout</code>, <code>WriteTimeout</code>, <code>IdleTimeout</code>; client: <code>http.Client.Timeout</code> + transport dial/TLS/response-header timeouts; per call: <code>context.WithTimeout</code> derived from the incoming request's deadline so the budget shrinks across hops. No timeout = unbounded goroutines and connections.</li> <li><strong>Retries</strong> — only for transient errors (connection reset, 503, gRPC <code>Unavailable</code>) and only for <em>idempotent</em> operations; capped exponential backoff with <strong>jitter</strong> (full jitter: <code>rand(0, min(cap, base·2ⁿ))</code>) to avoid synchronized retry storms; honour <code>Retry-After</code>; retry budgets (e.g. ≤ 10% extra load) and retry at one layer only — retries multiply across layers. Know what <code>net/http</code> already does: when a <em>reused</em> keep-alive connection fails before any response byte arrives, <code>http.Transport</code> re-sends the request once on a new connection. It does this for any request if nothing had been written yet, and otherwise only for replayable requests: GET/HEAD/OPTIONS/TRACE, or any method that carries an <code>Idempotency-Key</code>/<code>X-Idempotency-Key</code> header and has no body or a rewindable <code>GetBody</code>. It never retries timeouts, 5xx responses or failures after the response started; that is still your job.</li> <li><strong>Circuit breaker</strong> — closed → open after N failures (fail fast, shed load from a sick dependency) → half-open after a cooldown to probe → closed on success (<code>sony/gobreaker</code>).</li> <li><strong>Rate limiting</strong> — <code>golang.org/x/time/rate</code> token bucket: <code>rate.NewLimiter(r, burst)</code>, <code>Allow()</code> to reject (429) or <code>Wait(ctx)</code> to smooth outbound calls. Per-client limiters on the server; a shared store (Redis) for global limits.</li> <li><strong>Idempotency keys</strong> — clients send <code>Idempotency-Key</code> on non-idempotent POSTs; the server stores the first response and replays it for retries, making retries safe for payments and orders.</li> <li><strong>Also</strong> — bulkheads (bounded pools per dependency), load shedding (reject early when saturated), hedged requests for tail latency, graceful degradation (serve cached/stale data).</li> </ul>",
     "interview": "Interviewers love \"a downstream is slow — what happens to your service?\" Walk through timeouts and deadline propagation, bounded concurrency, retries with jitter only for idempotent calls, circuit breaking, and how idempotency keys make POST retries safe. Mention retry amplification across layers and the thundering-herd problem.",
     "examples": [
      {
       "label": "Client-side throttling + per-call timeout budget",
       "lang": "go",
       "code": "package inventory\n\nimport (\n    \"context\"\n    \"fmt\"\n    \"io\"\n    \"net/http\"\n    \"time\"\n\n    \"golang.org/x/time/rate\"\n)\n\n// 50 requests/s sustained, bursts of 10: protects the downstream from us.\nvar limiter = rate.NewLimiter(rate.Limit(50), 10)\n\nfunc GetStock(ctx context.Context, c *http.Client, url string) ([]byte, error) {\n    // Wait fails fast if the wait would exceed ctx's deadline.\n    if err := limiter.Wait(ctx); err != nil {\n        return nil, err\n    }\n    // Per-attempt budget, never longer than the caller's remaining deadline.\n    ctx, cancel := context.WithTimeout(ctx, 800*time.Millisecond)\n    defer cancel()\n\n    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)\n    if err != nil {\n        return nil, err\n    }\n    resp, err := c.Do(req)\n    if err != nil {\n        return nil, err\n    }\n    defer resp.Body.Close()\n    if resp.StatusCode >= 500 {\n        return nil, fmt.Errorf(\"inventory: upstream %s\", resp.Status) // retryable\n    }\n    return io.ReadAll(io.LimitReader(resp.Body, 1<<20))\n}"
      }
     ]
    },
    {
     "title": "Scaling Go Services: Horizontal vs Vertical",
     "def": "<strong>Vertical scaling</strong> (bigger pods) is simple and Go uses extra cores well (goroutines, GOMAXPROCS), but it has a ceiling and one replica is a single point of failure. <strong>Horizontal scaling</strong> (more replicas behind a load balancer, driven by the HPA on CPU or custom metrics such as RPS or queue lag) gives availability and elasticity — <em>if</em> the service is stateless. <ul> <li><strong>Statelessness</strong> — no session state, uploads or job state in process memory or on local disk; externalize to Redis, a database or object storage. In-memory caches are fine as <em>caches</em> but become inconsistent across replicas (use TTLs, pub/sub invalidation, or a shared cache).</li> <li><strong>Connection pools per replica</strong> — each replica has its own pool, so total DB connections = replicas × <code>SetMaxOpenConns</code>. With HPA max 20 and 25 conns each, that's 500 — likely above Postgres <code>max_connections</code>. Size pools from the DB budget, or add PgBouncer/RDS Proxy.</li> <li><strong>Sticky state pitfalls</strong> — sticky sessions unbalance load, break on scale-in/deploys and hide statefulness bugs. Local rate limiters and counters scale with replica count (each replica allows N/s); global limits need a shared store.</li> <li><strong>Singletons</strong> — cron jobs, schedulers and consumers that must run once need leader election (Kubernetes Lease via client-go) or a separate Deployment/CronJob.</li> <li><strong>Scaling signals</strong> — CPU works for CPU-bound Go services; use RPS, latency or queue depth (KEDA) for I/O-bound ones. Requests should reflect real usage so the scheduler and HPA make good decisions; startup time and readiness gates limit how fast you can scale.</li> </ul>",
     "interview": "A typical question: \"Your service runs fine with 2 replicas; at 30 replicas the database falls over and rate limits are wrong — why?\" Cover per-replica pools, local vs global state, cache coherence, leader election for singletons, sticky sessions, and choosing HPA metrics. Show you can do the connection-budget arithmetic.",
     "examples": [
      {
       "label": "Size the DB pool from a cluster-wide connection budget",
       "lang": "go",
       "code": "package db\n\nimport (\n    \"database/sql\"\n    \"time\"\n)\n\n// Budget: Postgres max_connections=200, keep 20 for admin/migrations,\n// HPA maxReplicas=12  →  180 / 12 = 15 connections per replica.\nfunc Configure(db *sql.DB) {\n    db.SetMaxOpenConns(15)\n    db.SetMaxIdleConns(15)\n    db.SetConnMaxLifetime(30 * time.Minute) // recycle: rebalances after failover / DNS change\n    db.SetConnMaxIdleTime(5 * time.Minute)\n}"
      },
      {
       "label": "HorizontalPodAutoscaler (autoscaling/v2)",
       "lang": "yaml",
       "code": "apiVersion: autoscaling/v2\nkind: HorizontalPodAutoscaler\nmetadata: {name: orders-api}\nspec:\n  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: orders-api}\n  minReplicas: 3\n  maxReplicas: 12          # must match the DB connection budget above\n  metrics:\n  - type: Resource\n    resource:\n      name: cpu\n      target: {type: Utilization, averageUtilization: 70}\n  behavior:\n    scaleDown: {stabilizationWindowSeconds: 300}"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "12-factor config loader: defaults, env, flags, validation",
     "d": "easy",
     "type": "coding",
     "hint": "<ul> <li>Start from defaults, overlay env vars, then register flags whose defaults are the env-derived values (so flags win).</li> <li>Inject <code>args</code> and <code>getenv</code> for testability; use <code>flag.NewFlagSet</code> with <code>ContinueOnError</code>.</li> <li>Collect all problems and return <code>errors.Join</code> — one restart shows every mistake.</li> <li>Implement <code>slog.LogValuer</code> so the DSN (with password) never reaches logs.</li> </ul>",
     "lang": "go",
     "solution": "package main\n\nimport (\n    \"errors\"\n    \"flag\"\n    \"fmt\"\n    \"log/slog\"\n    \"os\"\n    \"strconv\"\n    \"time\"\n)\n\ntype Config struct {\n    Addr            string\n    DatabaseURL     string // contains credentials\n    LogLevel        slog.Level\n    ShutdownTimeout time.Duration\n    MaxDBConns      int\n}\n\n// Load applies defaults < environment < flags, validates, and reports every error at once.\nfunc Load(args []string, getenv func(string) string) (Config, error) {\n    c := Config{Addr: \":8080\", LogLevel: slog.LevelInfo, ShutdownTimeout: 20 * time.Second, MaxDBConns: 10}\n    var errs []error\n\n    if v := getenv(\"ADDR\"); v != \"\" {\n        c.Addr = v\n    }\n    c.DatabaseURL = getenv(\"DATABASE_URL\")\n    if v := getenv(\"LOG_LEVEL\"); v != \"\" {\n        if err := c.LogLevel.UnmarshalText([]byte(v)); err != nil {\n            errs = append(errs, fmt.Errorf(\"LOG_LEVEL: %w\", err))\n        }\n    }\n    if v := getenv(\"SHUTDOWN_TIMEOUT\"); v != \"\" {\n        d, err := time.ParseDuration(v)\n        if err != nil {\n            errs = append(errs, fmt.Errorf(\"SHUTDOWN_TIMEOUT: %w\", err))\n        }\n        c.ShutdownTimeout = d\n    }\n    if v := getenv(\"MAX_DB_CONNS\"); v != \"\" {\n        n, err := strconv.Atoi(v)\n        if err != nil {\n            errs = append(errs, fmt.Errorf(\"MAX_DB_CONNS: %w\", err))\n        }\n        c.MaxDBConns = n\n    }\n\n    fs := flag.NewFlagSet(\"orders-api\", flag.ContinueOnError)\n    fs.StringVar(&c.Addr, \"addr\", c.Addr, \"listen address\")\n    fs.StringVar(&c.DatabaseURL, \"database-url\", c.DatabaseURL, \"Postgres DSN\")\n    fs.TextVar(&c.LogLevel, \"log-level\", c.LogLevel, \"debug|info|warn|error\")\n    fs.DurationVar(&c.ShutdownTimeout, \"shutdown-timeout\", c.ShutdownTimeout, \"graceful shutdown budget\")\n    fs.IntVar(&c.MaxDBConns, \"max-db-conns\", c.MaxDBConns, \"DB pool size per replica\")\n    if err := fs.Parse(args); err != nil {\n        return c, err\n    }\n\n    if c.DatabaseURL == \"\" {\n        errs = append(errs, errors.New(\"DATABASE_URL (or -database-url) is required\"))\n    }\n    if c.MaxDBConns < 1 {\n        errs = append(errs, errors.New(\"max DB conns must be >= 1\"))\n    }\n    if c.ShutdownTimeout <= 0 {\n        errs = append(errs, errors.New(\"shutdown timeout must be > 0\"))\n    }\n    return c, errors.Join(errs...)\n}\n\n// LogValue keeps the DSN out of logs.\nfunc (c Config) LogValue() slog.Value {\n    return slog.GroupValue(\n        slog.String(\"addr\", c.Addr),\n        slog.String(\"log_level\", c.LogLevel.String()),\n        slog.Duration(\"shutdown_timeout\", c.ShutdownTimeout),\n        slog.Int(\"max_db_conns\", c.MaxDBConns),\n        slog.Bool(\"database_url_set\", c.DatabaseURL != \"\"),\n    )\n}\n\nfunc main() {\n    cfg, err := Load(os.Args[1:], os.Getenv)\n    if err != nil {\n        fmt.Fprintln(os.Stderr, \"invalid config:\\n\"+err.Error())\n        os.Exit(2)\n    }\n    slog.Info(\"starting\", \"config\", cfg)\n}"
    },
    {
     "t": "Multi-stage Dockerfile: static, distroless, non-root, cached",
     "d": "easy",
     "type": "hands-on",
     "hint": "<ul> <li>Stage 1 (<code>golang</code>): copy <code>go.mod</code>/<code>go.sum</code> first, <code>go mod download</code>, then copy sources — dependency layers stay cached.</li> <li>BuildKit cache mounts for <code>/go/pkg/mod</code> and <code>/root/.cache/go-build</code>.</li> <li><code>CGO_ENABLED=0</code>, <code>-trimpath</code>, <code>-ldflags=\"-s -w\"</code>; cross-compile with <code>$BUILDPLATFORM</code>/<code>$TARGETARCH</code>.</li> <li>Stage 2: <code>distroless/static:nonroot</code>, copy only the binary, <code>USER nonroot</code>, exec-form <code>ENTRYPOINT</code> (so the binary is PID 1 and receives SIGTERM).</li> </ul>",
     "lang": "dockerfile",
     "solution": "# syntax=docker/dockerfile:1\nFROM --platform=$BUILDPLATFORM golang:1.26 AS build\nWORKDIR /src\nCOPY go.mod go.sum ./\nRUN --mount=type=cache,target=/go/pkg/mod go mod download\nCOPY . .\nARG TARGETOS TARGETARCH\nRUN --mount=type=cache,target=/go/pkg/mod \\\n    --mount=type=cache,target=/root/.cache/go-build \\\n    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \\\n    go build -trimpath -ldflags=\"-s -w\" -o /out/server ./cmd/server\n\n# ~2 MB base: CA certs, tzdata, nonroot user (uid 65532), no shell or package manager\nFROM gcr.io/distroless/static-debian12:nonroot\nCOPY --from=build /out/server /server\nUSER nonroot:nonroot\nEXPOSE 8080\nENTRYPOINT [\"/server\"]\n\n# Build multi-arch: docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/acme/api:1.4.2 --push ."
    },
    {
     "t": "Retry with capped exponential backoff and full jitter",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Backoff for attempt n: <code>min(max, base·2ⁿ)</code>; full jitter sleeps a random duration in <code>[0, backoff)</code> (<code>math/rand/v2</code> <code>rand.N</code>).</li> <li>Let callers mark errors as permanent (4xx, validation) so they are not retried.</li> <li>Sleep with a <code>select</code> on a timer and <code>ctx.Done()</code> — never <code>time.Sleep</code> in retry loops.</li> <li>Guard against shift overflow for large attempt counts; only retry idempotent operations.</li> </ul>",
     "lang": "go",
     "solution": "package retry\n\nimport (\n    \"context\"\n    \"errors\"\n    \"math/rand/v2\"\n    \"time\"\n)\n\n// Permanent marks an error that must not be retried.\ntype Permanent struct{ Err error }\n\nfunc (p Permanent) Error() string { return p.Err.Error() }\nfunc (p Permanent) Unwrap() error { return p.Err }\n\ntype Policy struct {\n    MaxAttempts int\n    Base, Max   time.Duration\n}\n\n// Do runs op until success, a Permanent error, MaxAttempts, or ctx cancellation.\nfunc Do(ctx context.Context, p Policy, op func(context.Context) error) error {\n    var err error\n    for attempt := range p.MaxAttempts {\n        if err = op(ctx); err == nil {\n            return nil\n        }\n        var perm Permanent\n        if errors.As(err, &perm) {\n            return perm.Err\n        }\n        if attempt == p.MaxAttempts-1 {\n            break\n        }\n        backoff := p.Max\n        if attempt < 30 { // avoid overflow of Base << attempt\n            backoff = min(p.Max, p.Base<<attempt)\n        }\n        sleep := rand.N(backoff + 1) // full jitter: [0, backoff]\n\n        t := time.NewTimer(sleep)\n        select {\n        case <-ctx.Done():\n            t.Stop()\n            return errors.Join(err, ctx.Err())\n        case <-t.C:\n        }\n    }\n    return err\n}\n\n// Usage:\n//   err := retry.Do(ctx, retry.Policy{MaxAttempts: 5, Base: 100 * time.Millisecond, Max: 5 * time.Second},\n//       func(ctx context.Context) error {\n//           resp, err := client.Do(req.WithContext(ctx))\n//           ... return retry.Permanent{Err: err} for 4xx responses\n//       })"
    },
    {
     "t": "Graceful shutdown with readiness, dependency checks and ordered teardown",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li><code>/livez</code> trivial; <code>/readyz</code> fails while draining or if a DB ping (500 ms timeout) fails.</li> <li><code>signal.NotifyContext</code> for SIGTERM; also exit if <code>ListenAndServe</code> fails.</li> <li>Order: fail readiness → wait for endpoint propagation → <code>srv.Shutdown</code> with a budget below <code>terminationGracePeriodSeconds</code> → cancel workers' context → wait → close the DB.</li> <li>Use <code>BaseContext</code> so request contexts aren't cancelled before the drain finishes; Go 1.25's <code>sync.WaitGroup.Go</code> simplifies worker tracking.</li> </ul>",
     "lang": "go",
     "solution": "package main\n\nimport (\n    \"context\"\n    \"database/sql\"\n    \"log/slog\"\n    \"net\"\n    \"net/http\"\n    \"os\"\n    \"os/signal\"\n    \"sync\"\n    \"sync/atomic\"\n    \"syscall\"\n    \"time\"\n)\n\nfunc main() {\n    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))\n    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)\n    defer stop()\n\n    db, err := sql.Open(\"pgx\", os.Getenv(\"DATABASE_URL\")) // driver import omitted\n    if err != nil {\n        logger.Error(\"db open\", \"err\", err)\n        os.Exit(1)\n    }\n\n    var draining atomic.Bool\n    mux := http.NewServeMux()\n    // Liveness: never check dependencies, or a DB blip restarts every pod.\n    mux.HandleFunc(\"GET /livez\", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte(\"ok\")) })\n    // Readiness: route traffic here only if we can actually serve it.\n    mux.HandleFunc(\"GET /readyz\", func(w http.ResponseWriter, r *http.Request) {\n        if draining.Load() {\n            http.Error(w, \"draining\", http.StatusServiceUnavailable)\n            return\n        }\n        pctx, cancel := context.WithTimeout(r.Context(), 500*time.Millisecond)\n        defer cancel()\n        if err := db.PingContext(pctx); err != nil {\n            http.Error(w, \"db unavailable\", http.StatusServiceUnavailable)\n            return\n        }\n        w.Write([]byte(\"ready\"))\n    })\n\n    // Cancelled only AFTER the HTTP drain, so in-flight requests finish normally.\n    baseCtx, cancelBase := context.WithCancel(context.Background())\n    srv := &http.Server{\n        Addr:              \":8080\",\n        Handler:           mux,\n        ReadHeaderTimeout: 5 * time.Second,\n        IdleTimeout:       60 * time.Second,\n        BaseContext:       func(net.Listener) context.Context { return baseCtx },\n    }\n\n    var workers sync.WaitGroup\n    workers.Go(func() { runWorker(baseCtx, logger) }) // Go 1.25+\n\n    srvErr := make(chan error, 1)\n    go func() { srvErr <- srv.ListenAndServe() }()\n    logger.Info(\"listening\", \"addr\", srv.Addr)\n\n    select {\n    case err := <-srvErr:\n        logger.Error(\"server failed\", \"err\", err)\n        os.Exit(1)\n    case <-ctx.Done():\n    }\n    stop()\n    logger.Info(\"shutdown started\")\n\n    draining.Store(true)        // 1. fail readiness\n    time.Sleep(5 * time.Second) // 2. let endpoint removal propagate (or preStop sleep)\n\n    shCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)\n    defer cancel()\n    if err := srv.Shutdown(shCtx); err != nil { // 3. stop accepting, drain in-flight\n        logger.Warn(\"drain incomplete, forcing close\", \"err\", err)\n        srv.Close()\n    }\n    cancelBase()   // 4. stop background work\n    workers.Wait()\n    db.Close()     // 5. shared resources last\n    logger.Info(\"shutdown complete\")\n}\n\nfunc runWorker(ctx context.Context, logger *slog.Logger) {\n    t := time.NewTicker(10 * time.Second)\n    defer t.Stop()\n    for {\n        select {\n        case <-ctx.Done():\n            logger.Info(\"worker stopped\")\n            return\n        case <-t.C:\n            // process a batch; pass ctx to every call\n        }\n    }\n}"
    },
    {
     "t": "Per-client rate-limiting middleware with x/time/rate",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Map client key → <code>*rate.Limiter</code> plus last-seen time, guarded by a mutex.</li> <li>Key by authenticated client ID, else <code>RemoteAddr</code> host; trust <code>X-Forwarded-For</code> only from known proxies.</li> <li>Reject with <strong>429</strong> and a <code>Retry-After</code> header.</li> <li>Evict idle entries in a background goroutine tied to a context (bounded memory, no leak).</li> <li>Remember: N replicas ⇒ N× the limit; global limits need Redis or a gateway.</li> </ul>",
     "lang": "go",
     "solution": "package ratelimit\n\nimport (\n    \"context\"\n    \"math\"\n    \"net\"\n    \"net/http\"\n    \"strconv\"\n    \"sync\"\n    \"time\"\n\n    \"golang.org/x/time/rate\"\n)\n\ntype entry struct {\n    lim      *rate.Limiter\n    lastSeen time.Time\n}\n\ntype PerClient struct {\n    mu      sync.Mutex\n    clients map[string]*entry\n    r       rate.Limit\n    burst   int\n}\n\n// New creates a limiter allowing r req/s with the given burst per client.\n// Idle clients are forgotten after ttl; the janitor stops when ctx is done.\nfunc New(ctx context.Context, r rate.Limit, burst int, ttl time.Duration) *PerClient {\n    pc := &PerClient{clients: map[string]*entry{}, r: r, burst: burst}\n    go pc.janitor(ctx, ttl)\n    return pc\n}\n\nfunc (pc *PerClient) limiter(key string) *rate.Limiter {\n    pc.mu.Lock()\n    defer pc.mu.Unlock()\n    e, ok := pc.clients[key]\n    if !ok {\n        e = &entry{lim: rate.NewLimiter(pc.r, pc.burst)}\n        pc.clients[key] = e\n    }\n    e.lastSeen = time.Now()\n    return e.lim\n}\n\nfunc (pc *PerClient) janitor(ctx context.Context, ttl time.Duration) {\n    t := time.NewTicker(ttl)\n    defer t.Stop()\n    for {\n        select {\n        case <-ctx.Done():\n            return\n        case <-t.C:\n            cutoff := time.Now().Add(-ttl)\n            pc.mu.Lock()\n            for k, e := range pc.clients {\n                if e.lastSeen.Before(cutoff) {\n                    delete(pc.clients, k)\n                }\n            }\n            pc.mu.Unlock()\n        }\n    }\n}\n\nfunc clientKey(r *http.Request) string {\n    host, _, err := net.SplitHostPort(r.RemoteAddr) // don't trust X-Forwarded-For blindly\n    if err != nil {\n        return r.RemoteAddr\n    }\n    return host\n}\n\nfunc (pc *PerClient) Middleware(next http.Handler) http.Handler {\n    retryAfter := strconv.Itoa(int(math.Ceil(1 / float64(pc.r))))\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        if !pc.limiter(clientKey(r)).Allow() {\n            w.Header().Set(\"Retry-After\", retryAfter)\n            http.Error(w, \"rate limit exceeded\", http.StatusTooManyRequests)\n            return\n        }\n        next.ServeHTTP(w, r)\n    })\n}"
    },
    {
     "t": "RED metrics middleware with Prometheus client_golang",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>Counter <code>http_requests_total{route,method,code}</code>, histogram <code>http_request_duration_seconds{route,method}</code>, gauge for in-flight.</li> <li>Wrap <code>ResponseWriter</code> to capture the status; add <code>Unwrap()</code> so <code>http.ResponseController</code> (Flush, deadlines) keeps working.</li> <li>Label with the matched route <em>pattern</em> (<code>mux.Handler(r)</code> returns it in Go 1.22+), never the raw path; normalise unknown methods — both are attacker-controlled cardinality bombs.</li> <li>Expose <code>promhttp.Handler()</code> on <code>/metrics</code> (ideally on a separate internal port).</li> </ul>",
     "lang": "go",
     "solution": "package metrics\n\nimport (\n    \"net/http\"\n    \"strconv\"\n    \"time\"\n\n    \"github.com/prometheus/client_golang/prometheus\"\n    \"github.com/prometheus/client_golang/prometheus/promauto\"\n    \"github.com/prometheus/client_golang/prometheus/promhttp\"\n)\n\nvar (\n    requests = promauto.NewCounterVec(prometheus.CounterOpts{\n        Name: \"http_requests_total\",\n        Help: \"HTTP requests by route, method and status code.\",\n    }, []string{\"route\", \"method\", \"code\"})\n\n    duration = promauto.NewHistogramVec(prometheus.HistogramOpts{\n        Name:    \"http_request_duration_seconds\",\n        Help:    \"HTTP request latency.\",\n        Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5},\n    }, []string{\"route\", \"method\"})\n\n    inflight = promauto.NewGauge(prometheus.GaugeOpts{\n        Name: \"http_requests_in_flight\",\n        Help: \"Requests currently being served.\",\n    })\n)\n\ntype recorder struct {\n    http.ResponseWriter\n    code int\n}\n\nfunc (r *recorder) WriteHeader(code int) {\n    r.code = code\n    r.ResponseWriter.WriteHeader(code)\n}\n\n// Unwrap lets http.ResponseController reach Flush/SetWriteDeadline on the real writer.\nfunc (r *recorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }\n\nfunc method(m string) string {\n    switch m {\n    case http.MethodGet, http.MethodHead, http.MethodPost, http.MethodPut,\n        http.MethodPatch, http.MethodDelete, http.MethodOptions:\n        return m\n    }\n    return \"OTHER\" // arbitrary methods would explode cardinality\n}\n\n// Instrument wraps a ServeMux and labels by the matched route pattern.\nfunc Instrument(mux *http.ServeMux) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        _, route := mux.Handler(r) // e.g. \"GET /orders/{id}\" — bounded set\n        if route == \"\" {\n            route = \"unmatched\"\n        }\n        inflight.Inc()\n        defer inflight.Dec()\n\n        rec := &recorder{ResponseWriter: w, code: http.StatusOK}\n        start := time.Now()\n        mux.ServeHTTP(rec, r)\n\n        m := method(r.Method)\n        requests.WithLabelValues(route, m, strconv.Itoa(rec.code)).Inc()\n        duration.WithLabelValues(route, m).Observe(time.Since(start).Seconds())\n    })\n}\n\n// Handler serves /metrics (Go runtime + process collectors are registered by default).\nfunc Handler() http.Handler { return promhttp.Handler() }"
    },
    {
     "t": "Debug: Go pod is CPU-throttled and OOMKilled under load",
     "d": "medium",
     "type": "debug",
     "hint": "Symptoms: p99 latency spikes, <code>kubectl describe pod</code> shows <code>Last State: Terminated, Reason: OOMKilled, Exit Code: 137</code>, heap graphs look \"fine\". Investigate: <ul> <li><code>container_cpu_cfs_throttled_periods_total</code> high → GOMAXPROCS above the CPU limit (pre-Go 1.25, or <code>GOMAXPROCS</code> hard-coded).</li> <li>Is <code>GOMEMLIMIT</code> set? Without it the GC targets ~2× live heap and overshoots the cgroup limit.</li> <li><code>GODEBUG=gctrace=1</code>, pprof heap/goroutine profiles: real leak (unbounded cache, goroutine leak) vs GC headroom?</li> <li>Check the <code>go</code> directive in go.mod — container-aware GOMAXPROCS only applies at ≥ 1.25.</li> </ul>",
     "lang": "yaml",
     "solution": "# Root causes (typical):\n# 1. Built with go.mod \"go 1.23\": GOMAXPROCS = 32 (node CPUs) with a 2-CPU limit\n#    → 32 threads burn the CFS quota in ~6ms of each 100ms period → throttled → p99 spikes.\n# 2. No GOMEMLIMIT: live heap 300Mi, GOGC=100 lets the heap reach ~600Mi > 512Mi limit → OOMKilled.\n#\n# Fixes:\n# - Bump go.mod to go 1.25+ (cgroup-aware GOMAXPROCS), or import go.uber.org/automaxprocs,\n#   or set GOMAXPROCS explicitly to the CPU limit.\n# - Set GOMEMLIMIT ~90% of the memory limit; keep GOGC=100 (or tune) so the GC works harder near the limit.\n# - If the live heap itself keeps growing: it's a leak — take pprof heap profiles (inuse_space) over time.\nresources:\n  requests: {cpu: \"1\", memory: 512Mi}\n  limits:   {cpu: \"2\", memory: 512Mi}\nenv:\n- name: GOMEMLIMIT\n  value: \"460MiB\"\n# - name: GOMAXPROCS        # only needed for Go < 1.25 without automaxprocs\n#   value: \"2\"\n# Verify after the change:\n#   kubectl top pod; rate(container_cpu_cfs_throttled_periods_total[5m]);\n#   go_memstats / go_gc_* metrics; GODEBUG=gctrace=1 in a canary"
    },
    {
     "t": "Circuit breaker from scratch (closed, open, half-open)",
     "d": "medium",
     "type": "coding",
     "hint": "<ul> <li>States: Closed (count consecutive failures), Open (reject with <code>ErrOpen</code> until the cooldown expires), HalfOpen (allow exactly one probe).</li> <li>Probe success → Closed; probe failure → Open again with a fresh cooldown.</li> <li>Use a generation counter so results from calls that started in an earlier state don't flip the current state.</li> <li>Only count real dependency failures (5xx, timeouts) — not 4xx or caller cancellation.</li> <li>Inject the clock (<code>now func() time.Time</code>) for deterministic tests.</li> </ul>",
     "lang": "go",
     "solution": "package breaker\n\nimport (\n    \"errors\"\n    \"sync\"\n    \"time\"\n)\n\nvar ErrOpen = errors.New(\"circuit breaker is open\")\n\ntype State int\n\nconst (\n    Closed State = iota\n    Open\n    HalfOpen\n)\n\ntype Breaker struct {\n    mu        sync.Mutex\n    state     State\n    gen       uint64 // increments on every state change\n    failures  int\n    probing   bool\n    openedAt  time.Time\n    threshold int\n    cooldown  time.Duration\n    now       func() time.Time\n}\n\nfunc New(threshold int, cooldown time.Duration) *Breaker {\n    return &Breaker{threshold: threshold, cooldown: cooldown, now: time.Now}\n}\n\n// Call runs fn unless the breaker is open; in half-open state only one probe runs.\nfunc (b *Breaker) Call(fn func() error) error {\n    gen, err := b.before()\n    if err != nil {\n        return err\n    }\n    err = fn()\n    b.after(gen, err)\n    return err\n}\n\nfunc (b *Breaker) setState(s State) {\n    b.state, b.failures, b.probing = s, 0, false\n    b.gen++\n    if s == Open {\n        b.openedAt = b.now()\n    }\n}\n\nfunc (b *Breaker) before() (uint64, error) {\n    b.mu.Lock()\n    defer b.mu.Unlock()\n    if b.state == Open {\n        if b.now().Sub(b.openedAt) < b.cooldown {\n            return 0, ErrOpen // fail fast, give the dependency room to recover\n        }\n        b.setState(HalfOpen)\n    }\n    if b.state == HalfOpen {\n        if b.probing {\n            return 0, ErrOpen\n        }\n        b.probing = true\n    }\n    return b.gen, nil\n}\n\nfunc (b *Breaker) after(gen uint64, err error) {\n    b.mu.Lock()\n    defer b.mu.Unlock()\n    if gen != b.gen {\n        return // started under a previous state; ignore\n    }\n    switch b.state {\n    case Closed:\n        if err == nil {\n            b.failures = 0\n            return\n        }\n        b.failures++\n        if b.failures >= b.threshold {\n            b.setState(Open)\n        }\n    case HalfOpen:\n        if err == nil {\n            b.setState(Closed)\n        } else {\n            b.setState(Open)\n        }\n    }\n}\n\nfunc (b *Breaker) State() State {\n    b.mu.Lock()\n    defer b.mu.Unlock()\n    return b.state\n}"
    },
    {
     "t": "Idempotency-Key middleware for safe POST retries",
     "d": "hard",
     "type": "coding",
     "hint": "<ul> <li>Scope the key by caller (tenant/user) and fingerprint the request (method + path + body hash) to detect a key reused with a different payload → 422.</li> <li>Atomically \"claim\" the key before running the handler; a concurrent duplicate gets 409 (in progress) with <code>Retry-After</code>.</li> <li>Capture status, headers and body; replay them for later duplicates (mark with a header).</li> <li>Don't cache 5xx — release the key so the client can genuinely retry. Expire entries after a TTL.</li> <li>Production: Redis <code>SET NX</code> with TTL, or a DB unique constraint written in the same transaction as the business change.</li> </ul>",
     "lang": "go",
     "solution": "package idempotency\n\nimport (\n    \"bytes\"\n    \"crypto/sha256\"\n    \"io\"\n    \"net/http\"\n    \"sync\"\n    \"time\"\n)\n\ntype entry struct {\n    fingerprint [32]byte\n    inFlight    bool\n    status      int\n    header      http.Header\n    body        []byte\n    expires     time.Time\n}\n\ntype Store struct {\n    mu    sync.Mutex\n    m     map[string]*entry\n    ttl   time.Duration\n    scope func(*http.Request) string // e.g. authenticated tenant/user ID\n}\n\nfunc New(ttl time.Duration, scope func(*http.Request) string) *Store {\n    return &Store{m: map[string]*entry{}, ttl: ttl, scope: scope}\n}\n\ntype recorder struct {\n    http.ResponseWriter\n    status int\n    buf    bytes.Buffer\n}\n\nfunc (r *recorder) WriteHeader(code int) { r.status = code; r.ResponseWriter.WriteHeader(code) }\nfunc (r *recorder) Write(p []byte) (int, error) {\n    r.buf.Write(p)\n    return r.ResponseWriter.Write(p)\n}\n\nfunc (s *Store) Middleware(next http.Handler) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        key := r.Header.Get(\"Idempotency-Key\")\n        if key == \"\" || (r.Method != http.MethodPost && r.Method != http.MethodPatch) {\n            next.ServeHTTP(w, r)\n            return\n        }\n        body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))\n        if err != nil {\n            http.Error(w, \"request body too large\", http.StatusRequestEntityTooLarge)\n            return\n        }\n        r.Body = io.NopCloser(bytes.NewReader(body))\n        fp := sha256.Sum256(append([]byte(r.Method+\" \"+r.URL.Path+\"\\n\"), body...))\n        scoped := s.scope(r) + \":\" + key\n\n        s.mu.Lock()\n        e, exists := s.m[scoped]\n        if exists && time.Now().After(e.expires) {\n            delete(s.m, scoped)\n            exists = false\n        }\n        if exists {\n            mismatch, inFlight := e.fingerprint != fp, e.inFlight\n            status, header, respBody := e.status, e.header, e.body\n            s.mu.Unlock()\n            switch {\n            case mismatch:\n                http.Error(w, \"Idempotency-Key reused with a different request\", http.StatusUnprocessableEntity)\n            case inFlight:\n                w.Header().Set(\"Retry-After\", \"1\")\n                http.Error(w, \"a request with this Idempotency-Key is in progress\", http.StatusConflict)\n            default:\n                for k, v := range header {\n                    w.Header()[k] = v\n                }\n                w.Header().Set(\"Idempotent-Replayed\", \"true\")\n                w.WriteHeader(status)\n                w.Write(respBody)\n            }\n            return\n        }\n        e = &entry{fingerprint: fp, inFlight: true, expires: time.Now().Add(s.ttl)}\n        s.m[scoped] = e // claim the key before doing the work\n        s.mu.Unlock()\n\n        rec := &recorder{ResponseWriter: w, status: http.StatusOK}\n        next.ServeHTTP(rec, r)\n\n        s.mu.Lock()\n        defer s.mu.Unlock()\n        if rec.status >= 500 {\n            delete(s.m, scoped) // transient failure: let the client retry for real\n            return\n        }\n        e.inFlight = false\n        e.status, e.header, e.body = rec.status, rec.Header().Clone(), rec.buf.Bytes()\n    })\n}"
    },
    {
     "t": "Design: scale a Go API from 2 to 50 replicas",
     "d": "hard",
     "type": "design",
     "hint": "Walk through what breaks and how you fix it: <ul> <li><strong>State</strong>: move sessions, uploads and job state out of process (Redis, object storage); in-memory caches get TTLs or pub/sub invalidation; remove sticky sessions.</li> <li><strong>Database</strong>: total connections = replicas × pool size — budget it, add PgBouncer/RDS Proxy, read replicas for read-heavy paths, cache hot reads.</li> <li><strong>Coordination</strong>: global rate limits in Redis/gateway; leader election (Kubernetes Lease) or a CronJob for singleton work; idempotent consumers for at-least-once queues.</li> <li><strong>Autoscaling</strong>: HPA on CPU or RPS/latency/queue lag (KEDA), realistic requests, fast startup, readiness gates, PodDisruptionBudgets, spread across zones (topologySpreadConstraints).</li> <li><strong>Runtime &amp; ops</strong>: right-size pods (GOMAXPROCS = CPU limit, GOMEMLIMIT), graceful shutdown for frequent scale-in, per-replica RED metrics, load tests to find the next bottleneck.</li> </ul>"
    }
   ],
   "interviewFocus": [
    {
     "q": "Walk through a rolling deployment in Kubernetes. How does your Go service avoid dropping requests?",
     "a": "<ol> <li>The new ReplicaSet starts pods; each must pass its <strong>startup</strong> then <strong>readiness</strong> probe before receiving traffic and before old pods are removed (<code>maxSurge</code>/<code>maxUnavailable</code>).</li> <li>An old pod is marked Terminating. <em>Concurrently</em>: the kubelet runs <code>preStop</code> then sends SIGTERM, and the EndpointSlice controller removes the pod — kube-proxy, ingress controllers and mesh sidecars learn this a few seconds later.</li> <li>So the service must keep serving briefly after SIGTERM: a <code>preStop</code> sleep (5–10 s) or an in-app delay with readiness failing.</li> <li>Then <code>http.Server.Shutdown(ctx)</code>: stop accepting, close idle keep-alives (clients reconnect to other pods), finish in-flight requests within a budget smaller than <code>terminationGracePeriodSeconds</code>.</li> <li>Stop consumers/workers (nack or finish messages), flush telemetry, close pools, exit 0 before SIGKILL.</li> </ol> Extras: long-lived connections (gRPC, WebSockets) need server-initiated GOAWAY/close; PodDisruptionBudgets protect against voluntary evictions; clients should retry idempotent requests on connection reset."
    },
    {
     "q": "Explain GOMAXPROCS and GOMEMLIMIT behaviour in containers, including what changed in Go 1.25.",
     "a": "<ul> <li><strong>CPU</strong>: CFS bandwidth control gives a container <code>quota</code> per 100 ms period (limit 2 CPU = 200 ms per period). Before Go 1.25 GOMAXPROCS = host CPUs, so a pod on a 64-core node could burn its quota in a few ms and then be throttled for the rest of the period — p99 latency spikes, GC slowed. Workarounds: <code>automaxprocs</code> or an explicit env var.</li> <li><strong>Go 1.25</strong>: on Linux the runtime reads the cgroup CPU limit and defaults GOMAXPROCS to it (rounded up, at least 2) when lower than the CPU count, and periodically updates it if the limit changes. Requires the <code>go</code> directive ≥ 1.25; disabled when GOMAXPROCS is set; CPU requests are ignored.</li> <li><strong>Memory</strong>: Go doesn't read the memory limit. The GC paces by GOGC (heap may reach ~2× live), so spikes cross the cgroup limit and the kernel OOM-kills (exit 137) — no Go panic, no stack trace. <code>GOMEMLIMIT</code> (Go 1.19) makes the GC work harder near a soft limit; set ~90% of the container limit. It can't save you from a genuine leak — then the GC thrashes (CPU capped at ~50% for GC) before the OOM.</li> <li><strong>Practice</strong>: memory request = limit for Go services (memory is incompressible); CPU limits are debated — some teams set only requests to avoid throttling, then GOMAXPROCS should be set explicitly.</li> </ul>"
    },
    {
     "q": "How do you implement retries safely in a microservice architecture?",
     "a": "<ul> <li><strong>What</strong>: only transient failures (connect errors, 502/503/504, gRPC Unavailable, ResourceExhausted with backoff) — never 4xx validation/auth errors.</li> <li><strong>Which operations</strong>: idempotent ones (GET, PUT, DELETE) or POSTs made idempotent with an Idempotency-Key that the server deduplicates.</li> <li><strong>How</strong>: capped exponential backoff with full jitter; honour <code>Retry-After</code>; each attempt gets a per-try timeout within the overall request deadline (propagated via context).</li> <li><strong>How much</strong>: retry budgets/token buckets (e.g. retries ≤ 10% of requests) and circuit breakers stop retry storms when a dependency is truly down; retry at a single layer — 3 retries at each of 4 layers is 4⁴ = 256× amplification.</li> <li><strong>Know the transport's own retry</strong>: <code>net/http</code> transparently re-sends replayable requests (idempotent methods or an <code>Idempotency-Key</code> header) once if a reused keep-alive connection dies before the response starts. It does not retry timeouts or 5xx, so your policy still owns those.</li> <li><strong>Observe</strong>: count attempts and give-ups separately; alert on retry rate.</li> </ul>"
    },
    {
     "q": "How would you instrument a new Go service for production observability?",
     "a": "<ul> <li><strong>Logs</strong>: <code>log/slog</code> JSON to stdout, request-scoped attrs (request ID, trace ID, user/tenant), consistent keys, levels; no secrets/PII (LogValuer redaction); sample noisy logs.</li> <li><strong>Metrics</strong>: RED per route via middleware (counter + histogram with sane buckets), USE for pools/queues (in-use, wait count, queue depth), Go runtime metrics (goroutines, GC pauses, heap), business KPIs. Bounded labels only.</li> <li><strong>Traces</strong>: OpenTelemetry SDK with OTLP exporter, otelhttp/otelgrpc instrumentation, W3C propagation, spans around DB/cache/queue calls, parent-based sampling, flush on shutdown.</li> <li><strong>Correlation</strong>: trace IDs in logs, exemplars on histograms linking metrics to traces.</li> <li><strong>Operate</strong>: SLOs (availability, latency) with burn-rate alerts, dashboards per service, pprof endpoints on an internal port or continuous profiling.</li> </ul>"
    },
    {
     "q": "Your service is fine at 2 replicas, but at 30 replicas the database falls over and rate limits are wrong. Why?",
     "a": "<ul> <li><strong>Connection explosion</strong>: each replica has its own <code>database/sql</code> pool; 30 × <code>MaxOpenConns</code> 25 = 750 connections, beyond Postgres <code>max_connections</code> and memory. Fix: size per-replica pools from a global budget, add a pooler (PgBouncer, RDS Proxy), cap HPA <code>maxReplicas</code>.</li> <li><strong>Local rate limiters</strong>: 100 req/s per replica means 3,000 req/s total. Use a shared limiter (Redis token bucket / gateway) or divide by replica count (fragile under autoscaling).</li> <li><strong>Caches</strong>: 30 cold in-memory caches → miss storms on the DB after every deploy; inconsistent data between replicas. Use a shared cache, request coalescing (<code>singleflight</code>), TTL jitter.</li> <li><strong>Singleton work</strong>: cron/cleanup jobs now run 30× — use leader election or a CronJob.</li> <li><strong>Thundering herd</strong>: synchronized retries or cache expiries from many replicas — add jitter everywhere.</li> </ul>"
    }
   ],
   "quiz": [
    {
     "q": "What is the difference between a liveness and a readiness probe failure?",
     "a": "Liveness failure makes the kubelet restart the container; readiness failure only removes the pod from Service endpoints (no restart)."
    },
    {
     "q": "What does http.Server.Shutdown do, and what does it not handle?",
     "a": "It closes listeners, closes idle connections and waits for active requests to finish (until ctx expires). It does not wait for hijacked connections such as WebSockets — use RegisterOnShutdown for those."
    },
    {
     "q": "Since Go 1.25, how is the default GOMAXPROCS chosen on Linux?",
     "a": "It considers the cgroup CPU limit: if the limit is lower than the number of logical CPUs, GOMAXPROCS defaults to the limit (rounded up, minimum 2) and is updated if the limit changes — unless GOMAXPROCS is set explicitly or the go.mod go version is below 1.25."
    },
    {
     "q": "What exit code and reason indicate the kernel killed a container for exceeding its memory limit?",
     "a": "Exit code 137 (SIGKILL) with reason OOMKilled."
    },
    {
     "q": "Why build Go images with CGO_ENABLED=0?",
     "a": "It produces a statically linked binary with no libc dependency, so it runs on scratch/distroless static images (and uses the pure-Go DNS resolver)."
    },
    {
     "q": "What does \"full jitter\" mean in exponential backoff?",
     "a": "Sleeping a uniformly random duration between 0 and the capped exponential backoff, which spreads out retries and prevents synchronized retry storms."
    },
    {
     "q": "What do the methods Allow and Wait on a golang.org/x/time/rate Limiter do?",
     "a": "Allow reports whether a token is available now (non-blocking, for rejecting with 429); Wait blocks until a token is available or the context is cancelled or its deadline would be exceeded."
    },
    {
     "q": "What are the RED metrics?",
     "a": "Rate (requests per second), Errors (failed requests), Duration (latency distribution, usually a histogram)."
    }
   ],
   "resources": [
    {
     "title": "Go 1.25 Release Notes (container-aware GOMAXPROCS)",
     "url": "https://go.dev/doc/go1.25",
     "type": "docs"
    },
    {
     "title": "A Guide to the Go Garbage Collector (GOGC, GOMEMLIMIT)",
     "url": "https://go.dev/doc/gc-guide",
     "type": "docs"
    },
    {
     "title": "Kubernetes — Configure Liveness, Readiness and Startup Probes",
     "url": "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/",
     "type": "docs"
    },
    {
     "title": "OpenTelemetry — Go Getting Started",
     "url": "https://opentelemetry.io/docs/languages/go/getting-started/",
     "type": "docs"
    }
   ]
  },
  {
   "n": 12,
   "title": "Kubernetes Programming with Go",
   "group": "Cloud-Native Go (Weeks 9–14)",
   "summary": "Talk to the Kubernetes API from Go with client-go, build efficient informer + workqueue controllers, and ship production operators with controller-runtime/kubebuilder, leader election and admission webhooks. This is the core skill behind every cloud-native Go backend role.",
   "topics": [
    {
     "title": "client-go basics: config, clientsets, CRUD & patches",
     "def": "<p><strong>client-go</strong> (<code>k8s.io/client-go</code>) is the official Go client used by kubectl, kube-controller-manager and every operator. Its versions track Kubernetes: <code>v0.N.x</code> ↔ Kubernetes 1.N (for example <code>v0.34.x</code> ↔ 1.34) — keep the minor aligned with <code>k8s.io/api</code> and <code>k8s.io/apimachinery</code>.</p><ul><li><strong>Config</strong>: <code>rest.InClusterConfig()</code> uses the mounted ServiceAccount token (<code>/var/run/secrets/kubernetes.io/serviceaccount/</code>) and <code>KUBERNETES_SERVICE_HOST</code>. Outside the cluster use <code>clientcmd.BuildConfigFromFlags(\"\", path)</code> or the deferred loading rules that honour <code>$KUBECONFIG</code> and contexts.</li><li><strong>Typed clientset</strong>: <code>kubernetes.NewForConfig(cfg)</code> → <code>cs.CoreV1().Pods(ns)</code>, <code>cs.AppsV1().Deployments(ns)</code> with compile-time types. Accept <code>kubernetes.Interface</code> so tests can pass a fake clientset: <code>fake.NewClientset()</code> in current client-go. It also understands Server-Side Apply; the older <code>fake.NewSimpleClientset()</code> is deprecated.</li><li><strong>Dynamic client</strong>: <code>dynamic.NewForConfig</code> + a <code>schema.GroupVersionResource</code> works with any resource (CRDs without Go types) and returns <code>*unstructured.Unstructured</code>.</li><li><strong>CRUD</strong>: every verb takes a <code>context.Context</code> plus options — <code>Get</code>, <code>List(ctx, metav1.ListOptions{LabelSelector: \"app=web,tier!=cache\", FieldSelector: \"status.phase=Running\"})</code>, <code>Create</code>, <code>Update</code>, <code>Delete</code>, <code>Watch</code>. Paginate big lists with <code>Limit</code>/<code>Continue</code>.</li><li><strong>Patch types</strong>: JSON Patch (RFC 6902 ops), JSON Merge Patch (RFC 7386 — replaces whole lists), Strategic Merge Patch (built-in types only; merges lists by key such as container <code>name</code>) and <strong>Server-Side Apply</strong> (<code>Apply()</code> with a <code>FieldManager</code>), which records field ownership in <code>managedFields</code> and is the modern default for controllers.</li></ul><p>Client-side throttling defaults to <code>QPS=5, Burst=10</code> on <code>rest.Config</code>; raise it for busy controllers (the server also enforces API Priority &amp; Fairness). Inspect errors with <code>apierrors.IsNotFound</code>, <code>IsConflict</code>, <code>IsAlreadyExists</code>.</p>",
     "interview": "Expect: \"how does a pod authenticate to the API server?\" (projected ServiceAccount token + RBAC), \"typed vs dynamic client — when each?\", and \"merge vs strategic merge vs server-side apply\". Mention the default QPS/Burst limits and that you accept kubernetes.Interface to unit test with the fake clientset.",
     "examples": [
      {
       "label": "Config fallback + list pods by label selector",
       "lang": "go",
       "code": "func newClient() (kubernetes.Interface, error) {\n    cfg, err := rest.InClusterConfig()\n    if err != nil { // not in a pod: use $KUBECONFIG or ~/.kube/config\n        rules := clientcmd.NewDefaultClientConfigLoadingRules()\n        cfg, err = clientcmd.NewNonInteractiveDeferredLoadingClientConfig(\n            rules, &clientcmd.ConfigOverrides{}).ClientConfig()\n        if err != nil {\n            return nil, err\n        }\n    }\n    cfg.QPS, cfg.Burst = 50, 100 // defaults (5/10) are too low for controllers\n    return kubernetes.NewForConfig(cfg)\n}\n\nfunc runningWebPods(ctx context.Context, cs kubernetes.Interface, ns string) ([]string, error) {\n    list, err := cs.CoreV1().Pods(ns).List(ctx, metav1.ListOptions{\n        LabelSelector: \"app=web\",\n        FieldSelector: \"status.phase=Running\",\n    })\n    if err != nil {\n        return nil, err\n    }\n    names := make([]string, 0, len(list.Items))\n    for _, p := range list.Items {\n        names = append(names, p.Name)\n    }\n    return names, nil\n}"
      },
      {
       "label": "Dynamic client for a CRD without Go types",
       "lang": "go",
       "code": "dyn, err := dynamic.NewForConfig(cfg)\nif err != nil {\n    return err\n}\ngvr := schema.GroupVersionResource{Group: \"cert-manager.io\", Version: \"v1\", Resource: \"certificates\"}\nlist, err := dyn.Resource(gvr).Namespace(\"prod\").List(ctx, metav1.ListOptions{})\nif err != nil {\n    return err\n}\nfor _, u := range list.Items {\n    conds, _, _ := unstructured.NestedSlice(u.Object, \"status\", \"conditions\")\n    fmt.Println(u.GetName(), \"conditions:\", len(conds))\n}"
      }
     ]
    },
    {
     "title": "Informers, listers & workqueues",
     "def": "<p>Polling the API server (<code>List</code> every few seconds) does not scale: it multiplies load on kube-apiserver and etcd, burns your client QPS budget and still misses short-lived states. An <strong>informer</strong> does one <code>List</code>, then a long-lived <code>Watch</code> from the returned <code>resourceVersion</code>, and maintains an indexed in-memory <strong>cache</strong>.</p><ul><li><strong>Pipeline</strong>: Reflector (ListAndWatch) → DeltaFIFO → Indexer (thread-safe store) → your <code>ResourceEventHandler</code> (<code>AddFunc/UpdateFunc/DeleteFunc</code>). If the watch expires (<code>410 Gone</code>) the reflector re-lists transparently.</li><li><strong>SharedInformerFactory</strong>: <code>informers.NewSharedInformerFactory(cs, resync)</code> shares one watch + cache per resource type across all controllers in the process. Narrow it with <code>NewSharedInformerFactoryWithOptions(..., informers.WithNamespace(ns), informers.WithTweakListOptions(...))</code>.</li><li><strong>Listers</strong> read from the cache (<code>lister.Pods(ns).List(selector)</code>) with zero API calls. Cached objects are shared pointers — <strong>never mutate them</strong>; call <code>DeepCopy()</code> first.</li><li><strong>Resync</strong> periodically re-delivers every cached object as an <code>Update</code> from the local cache (not a re-list). It is a safety net for drift with external systems; <code>0</code> disables it.</li><li><strong>Workqueue</strong>: handlers only enqueue a <code>namespace/name</code> key; workers pop keys. The rate-limiting queue de-duplicates keys, guarantees a key is never processed by two workers concurrently, and gives per-item exponential backoff via <code>AddRateLimited</code>/<code>Forget</code>/<code>Done</code>. Use the generic <code>workqueue.NewTypedRateLimitingQueue</code> (client-go ≥ v0.31).</li></ul><p>Always call <code>factory.Start(ctx.Done())</code> then <code>WaitForCacheSync</code> before starting workers — reconciling against an empty cache can make a controller think every child is missing.</p>",
     "interview": "Be ready to draw Reflector → DeltaFIFO → Indexer → handler → workqueue → worker, and explain why handlers enqueue keys instead of objects (dedup, always read latest state). Know DeletedFinalStateUnknown tombstones, that resync replays the cache rather than re-listing, and why you must DeepCopy before mutating cached objects.",
     "examples": [
      {
       "label": "SharedInformerFactory + typed rate-limited workqueue",
       "lang": "go",
       "code": "factory := informers.NewSharedInformerFactory(cs, 10*time.Minute)\npods := factory.Core().V1().Pods()\n\nqueue := workqueue.NewTypedRateLimitingQueue(\n    workqueue.DefaultTypedControllerRateLimiter[string]())\ndefer queue.ShutDown()\n\nenqueue := func(obj any) {\n    // handles cache.DeletedFinalStateUnknown tombstones on delete\n    key, err := cache.DeletionHandlingMetaNamespaceKeyFunc(obj)\n    if err == nil {\n        queue.Add(key)\n    }\n}\n_, err := pods.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{\n    AddFunc:    enqueue,\n    UpdateFunc: func(_, newObj any) { enqueue(newObj) },\n    DeleteFunc: enqueue,\n})\nif err != nil {\n    return err\n}\n\nfactory.Start(ctx.Done())\nfor typ, ok := range factory.WaitForCacheSync(ctx.Done()) {\n    if !ok {\n        return fmt.Errorf(\"cache for %v did not sync\", typ)\n    }\n}\n// Reads now hit the local cache, not the API server:\nweb, _ := pods.Lister().Pods(\"prod\").List(labels.SelectorFromSet(labels.Set{\"app\": \"web\"}))\nfmt.Println(\"cached web pods:\", len(web))"
      }
     ]
    },
    {
     "title": "Controller pattern & reconciliation",
     "def": "<p>A controller drives <strong>observed state</strong> toward <strong>desired state</strong> in a loop. Kubernetes controllers are <strong>level-triggered</strong>: the reconcile function receives only a key and recomputes everything from current state, rather than reacting to the delta in an event (edge-triggered). Missed, duplicated or coalesced events are therefore harmless.</p><ul><li><strong>Idempotent reconcile</strong>: running it 1 or 100 times yields the same result. Use deterministic child names, create-or-update, and treat <code>AlreadyExists</code>/<code>NotFound</code> as normal outcomes.</li><li><strong>Owner references</strong>: set <code>metadata.ownerReferences</code> (with <code>controller: true</code>) on children so the garbage collector deletes them when the owner goes away and so child events map back to the owner. Namespaced children cannot have owners in another namespace.</li><li><strong>Deletion propagation</strong>: <code>Background</code> (default — owner deleted first, GC removes dependents), <code>Foreground</code> (dependents with <code>blockOwnerDeletion</code> first) or <code>Orphan</code>.</li><li><strong>Finalizers</strong>: a non-empty <code>metadata.finalizers</code> list makes deletion set <code>deletionTimestamp</code> instead of removing the object; your controller cleans up external resources (DNS, cloud LB, buckets) and then removes its finalizer.</li><li><strong>Status subresource</strong>: spec (desired, user-owned) and status (observed, controller-owned) are written through different endpoints; <code>metadata.generation</code> bumps only on spec changes, so publish <code>status.observedGeneration</code> and <code>Conditions</code>.</li><li><strong>Conflicts</strong>: updates use optimistic concurrency on <code>resourceVersion</code>; a stale write returns <code>409 Conflict</code>. Re-read and retry (<code>retry.RetryOnConflict</code>), or use patches/SSA that do not require the latest version.</li></ul>",
     "interview": "The killer question is \"what happens if your controller crashes halfway through reconcile?\" Answer: nothing bad, because reconcile is level-triggered and idempotent; on restart the informer re-lists and every object is reconciled again. Also explain generation vs observedGeneration and why status must never be computed from in-memory state that is not reconstructible.",
     "examples": [
      {
       "label": "Retry a read-modify-write on conflict",
       "lang": "go",
       "code": "err := retry.RetryOnConflict(retry.DefaultRetry, func() error {\n    d, err := cs.AppsV1().Deployments(ns).Get(ctx, name, metav1.GetOptions{})\n    if err != nil {\n        return err\n    }\n    if d.Annotations == nil {\n        d.Annotations = map[string]string{}\n    }\n    d.Annotations[\"example.com/last-audit\"] = time.Now().UTC().Format(time.RFC3339)\n    _, err = cs.AppsV1().Deployments(ns).Update(ctx, d, metav1.UpdateOptions{})\n    return err // a 409 Conflict triggers another Get + Update with backoff\n})"
      },
      {
       "label": "Owner reference + finalizer as seen in metadata",
       "lang": "yaml",
       "code": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: shop\n  namespace: prod\n  ownerReferences:\n  - apiVersion: web.example.com/v1alpha1\n    kind: WebApp\n    name: shop\n    uid: 6f1c2a9e-0d1b-4a55-9a7e-2a1f3c4b5d6e\n    controller: true\n    blockOwnerDeletion: true\n---\napiVersion: web.example.com/v1alpha1\nkind: WebApp\nmetadata:\n  name: shop\n  namespace: prod\n  finalizers:\n  - web.example.com/dns-cleanup\n  # after kubectl delete: deletionTimestamp is set, object stays until the list is empty"
      }
     ]
    },
    {
     "title": "Operators with controller-runtime & kubebuilder",
     "def": "<p>An <strong>operator</strong> = Custom Resource Definition (your API) + controller (your operational knowledge). <strong>controller-runtime</strong> (<code>sigs.k8s.io/controller-runtime</code>) wraps client-go informers/workqueues in a <code>Manager</code>; <strong>kubebuilder</strong> scaffolds the project (<code>api/</code>, <code>internal/controller/</code>, <code>cmd/main.go</code>, <code>config/</code>) and runs <code>controller-gen</code>.</p><ul><li><strong>Markers</strong> generate artifacts from Go comments: <code>+kubebuilder:object:root=true</code>, <code>+kubebuilder:subresource:status</code>, <code>+kubebuilder:validation:Minimum=1</code>, <code>+kubebuilder:printcolumn</code>, <code>+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete</code>. <code>make manifests generate</code> produces CRD YAML, RBAC and <code>DeepCopy</code> methods.</li><li><strong>Reconcile(ctx, req ctrl.Request) (ctrl.Result, error)</strong>: <code>req</code> is just a <code>NamespacedName</code>. Wire it with <code>ctrl.NewControllerManagedBy(mgr).For(&amp;WebApp{}).Owns(&amp;appsv1.Deployment{}).Complete(r)</code>; <code>Owns</code> maps child events to the owner via the controller owner reference.</li><li><strong>Requeue semantics</strong>: return an <code>error</code> → requeue with per-item exponential backoff; <code>Result{RequeueAfter: d}</code> → re-check later (polling external state); <code>Result{}</code> + <code>nil</code> → done until the next event. <code>reconcile.TerminalError(err)</code> records an error without retrying. Prefer <code>RequeueAfter</code> over the older <code>Requeue: true</code>.</li><li><strong>Client</strong>: <code>mgr.GetClient()</code> reads from the informer cache (may be stale) and writes to the API server — design for eventual consistency. <code>controllerutil.CreateOrUpdate</code> and <code>SetControllerReference</code> cover most child management.</li><li><strong>Testing</strong>: <code>envtest</code> starts a real kube-apiserver + etcd (no kubelet, no built-in controllers, so no GC and pods never run) for fast integration tests; unit-test pure logic with the fake client.</li></ul>",
     "interview": "Interviewers probe requeue semantics (error vs RequeueAfter vs nil), why reads can be stale with the cached client, how Owns() maps child events back to the parent, and how you test: envtest for API-level behaviour, fake client for unit tests, kind/e2e for full behaviour. Mention predicates such as GenerationChangedPredicate to avoid status-update loops.",
     "examples": [
      {
       "label": "CRD types with kubebuilder markers",
       "lang": "go",
       "code": "// WebAppSpec is the desired state.\ntype WebAppSpec struct {\n    // +kubebuilder:validation:MinLength=1\n    Image string `json:\"image\"`\n    // +kubebuilder:validation:Minimum=1\n    // +kubebuilder:validation:Maximum=50\n    Replicas int32 `json:\"replicas\"`\n}\n\n// WebAppStatus is the observed state, written only by the controller.\ntype WebAppStatus struct {\n    ObservedGeneration int64              `json:\"observedGeneration,omitempty\"`\n    AvailableReplicas  int32              `json:\"availableReplicas,omitempty\"`\n    Conditions         []metav1.Condition `json:\"conditions,omitempty\"`\n}\n\n// +kubebuilder:object:root=true\n// +kubebuilder:subresource:status\n// +kubebuilder:printcolumn:name=\"Ready\",type=integer,JSONPath=`.status.availableReplicas`\ntype WebApp struct {\n    metav1.TypeMeta   `json:\",inline\"`\n    metav1.ObjectMeta `json:\"metadata,omitempty\"`\n    Spec   WebAppSpec   `json:\"spec,omitempty\"`\n    Status WebAppStatus `json:\"status,omitempty\"`\n}"
      },
      {
       "label": "Scaffold and run an operator with kubebuilder",
       "lang": "bash",
       "code": "kubebuilder init --domain example.com --repo github.com/acme/webapp-operator\nkubebuilder create api --group web --version v1alpha1 --kind WebApp --resource --controller\nmake manifests generate   # controller-gen: CRDs, RBAC, DeepCopy\nmake install              # apply CRDs to the current kubecontext\nmake run                  # run the manager locally against the cluster\nmake test                 # envtest-based tests (setup-envtest downloads apiserver+etcd)\nkubebuilder create webhook --group web --version v1alpha1 --kind WebApp --programmatic-validation"
      }
     ]
    },
    {
     "title": "Leader election & admission webhooks",
     "def": "<p><strong>Leader election</strong> lets you run 2–3 operator replicas for availability while only one actively reconciles (two active writers would fight). client-go implements it with a <code>coordination.k8s.io/v1</code> <strong>Lease</strong>: the leader writes <code>holderIdentity</code> and renews <code>renewTime</code>; candidates take over once <code>LeaseDuration</code> expires.</p><ul><li>Typical timings: <code>LeaseDuration=15s</code>, <code>RenewDeadline=10s</code>, <code>RetryPeriod=2s</code>. If the leader cannot renew within <code>RenewDeadline</code> it must stop work (controller-runtime exits the process) — this bounds the split-brain window but relies on reasonably synchronised clocks.</li><li>controller-runtime: <code>ctrl.Options{LeaderElection: true, LeaderElectionID: \"webapp.example.com\", LeaderElectionReleaseOnCancel: true}</code>. Runnables implementing <code>NeedLeaderElection() bool</code> returning false (metrics, webhooks) run on every replica.</li><li>Leader election is not a lock for external systems: pair it with <strong>fencing</strong> (e.g. resourceVersion preconditions) if a deposed leader could still write elsewhere.</li></ul><p><strong>Admission webhooks</strong> intercept API requests after authentication/authorization and before persistence. <strong>Mutating</strong> webhooks run first (inject sidecars, set defaults, return a JSON Patch); <strong>validating</strong> webhooks run after and can only allow/deny. Both receive an <code>AdmissionReview</code> (<code>admission.k8s.io/v1</code>) over HTTPS with a CA bundle (usually injected by cert-manager). Key settings: <code>failurePolicy</code> (Fail vs Ignore), <code>sideEffects: None</code>, <code>timeoutSeconds</code> (default 10, max 30), <code>namespaceSelector</code>/<code>objectSelector</code>, CEL <code>matchConditions</code>, and <code>reinvocationPolicy</code>. For simple rules prefer in-process <strong>ValidatingAdmissionPolicy</strong> (CEL, GA since Kubernetes 1.30) — no server to run. Its mutating counterpart, <strong>MutatingAdmissionPolicy</strong> (CEL-based patches, beta since Kubernetes 1.34), is becoming the low-risk alternative to simple defaulting webhooks.</p>",
     "interview": "Discuss what happens when the leader is network-partitioned (it stops after RenewDeadline; a new leader starts after LeaseDuration), why webhooks run on all replicas, and the blast radius of failurePolicy: Fail on a webhook that matches kube-system (it can wedge the cluster). Mention ValidatingAdmissionPolicy as the lower-risk alternative for validation.",
     "examples": [
      {
       "label": "Leader election with a Lease (plain client-go)",
       "lang": "go",
       "code": "id, _ := os.Hostname()\nlock := &resourcelock.LeaseLock{\n    LeaseMeta:  metav1.ObjectMeta{Name: \"webapp-operator\", Namespace: \"operators\"},\n    Client:     cs.CoordinationV1(),\n    LockConfig: resourcelock.ResourceLockConfig{Identity: id},\n}\nleaderelection.RunOrDie(ctx, leaderelection.LeaderElectionConfig{\n    Lock:            lock,\n    LeaseDuration:   15 * time.Second,\n    RenewDeadline:   10 * time.Second,\n    RetryPeriod:     2 * time.Second,\n    ReleaseOnCancel: true,\n    Callbacks: leaderelection.LeaderCallbacks{\n        OnStartedLeading: func(ctx context.Context) { runControllers(ctx) },\n        OnStoppedLeading: func() { klog.Info(\"lost lease, exiting\"); os.Exit(0) },\n        OnNewLeader:      func(identity string) { klog.Info(\"leader is \", identity) },\n    },\n})"
      },
      {
       "label": "ValidatingWebhookConfiguration",
       "lang": "yaml",
       "code": "apiVersion: admissionregistration.k8s.io/v1\nkind: ValidatingWebhookConfiguration\nmetadata:\n  name: webapp-validator\n  annotations:\n    cert-manager.io/inject-ca-from: operators/webapp-serving-cert\nwebhooks:\n- name: vwebapp.web.example.com\n  admissionReviewVersions: [\"v1\"]\n  sideEffects: None\n  failurePolicy: Fail\n  timeoutSeconds: 5\n  clientConfig:\n    service:\n      name: webapp-webhook\n      namespace: operators\n      path: /validate-web-example-com-v1alpha1-webapp\n  rules:\n  - apiGroups: [\"web.example.com\"]\n    apiVersions: [\"v1alpha1\"]\n    operations: [\"CREATE\", \"UPDATE\"]\n    resources: [\"webapps\"]\n  namespaceSelector:\n    matchExpressions:\n    - key: kubernetes.io/metadata.name\n      operator: NotIn\n      values: [\"kube-system\"]"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "List pods by label selector with in-cluster/kubeconfig fallback",
     "d": "easy",
     "type": "coding",
     "hint": "<ul><li>Try <code>rest.InClusterConfig()</code>; on error fall back to kubeconfig loading rules (honour <code>$KUBECONFIG</code>).</li><li>Build a clientset and accept <code>kubernetes.Interface</code> for testability.</li><li>Pass <code>LabelSelector</code> in <code>metav1.ListOptions</code>; paginate with <code>Limit</code> + <code>Continue</code>.</li><li>Use a context with timeout for every API call.</li></ul>",
     "solution": "package main\n\nimport (\n    \"context\"\n    \"flag\"\n    \"fmt\"\n    \"log\"\n    \"time\"\n\n    metav1 \"k8s.io/apimachinery/pkg/apis/meta/v1\"\n    \"k8s.io/client-go/kubernetes\"\n    \"k8s.io/client-go/rest\"\n    \"k8s.io/client-go/tools/clientcmd\"\n)\n\nfunc loadConfig() (*rest.Config, error) {\n    if cfg, err := rest.InClusterConfig(); err == nil {\n        return cfg, nil\n    }\n    rules := clientcmd.NewDefaultClientConfigLoadingRules() // $KUBECONFIG or ~/.kube/config\n    return clientcmd.NewNonInteractiveDeferredLoadingClientConfig(rules, &clientcmd.ConfigOverrides{}).ClientConfig()\n}\n\nfunc listPods(ctx context.Context, cs kubernetes.Interface, ns, selector string) error {\n    opts := metav1.ListOptions{LabelSelector: selector, Limit: 500}\n    for {\n        page, err := cs.CoreV1().Pods(ns).List(ctx, opts)\n        if err != nil {\n            return err\n        }\n        for _, p := range page.Items {\n            fmt.Println(p.Namespace, p.Name, p.Status.Phase, p.Spec.NodeName)\n        }\n        if page.Continue == \"\" {\n            return nil\n        }\n        opts.Continue = page.Continue\n    }\n}\n\nfunc main() {\n    ns := flag.String(\"n\", \"\", \"namespace (empty = all)\")\n    sel := flag.String(\"l\", \"app=web\", \"label selector, e.g. app=web,tier!=cache\")\n    flag.Parse()\n\n    cfg, err := loadConfig()\n    if err != nil {\n        log.Fatalf(\"load config: %v\", err)\n    }\n    cs, err := kubernetes.NewForConfig(cfg)\n    if err != nil {\n        log.Fatalf(\"clientset: %v\", err)\n    }\n    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)\n    defer cancel()\n    if err := listPods(ctx, cs, *ns, *sel); err != nil {\n        log.Fatalf(\"list pods: %v\", err)\n    }\n}",
     "lang": "go"
    },
    {
     "t": "Scale and update a Deployment with the right patch type",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>Replicas: a <strong>JSON merge patch</strong> <code>{\"spec\":{\"replicas\":N}}</code> needs no prior read and cannot conflict.</li><li>Image of one container: <strong>strategic merge patch</strong> merges the <code>containers</code> list by <code>name</code>; a plain merge patch would replace the whole list.</li><li>Controllers: <strong>Server-Side Apply</strong> with a stable <code>FieldManager</code> declares only the fields you own.</li><li>Unit test with <code>fake.NewClientset()</code>. The deprecated <code>NewSimpleClientset</code> cannot handle Server-Side Apply patches.</li></ul>",
     "solution": "package kubeops\n\nimport (\n    \"context\"\n    \"fmt\"\n\n    metav1 \"k8s.io/apimachinery/pkg/apis/meta/v1\"\n    \"k8s.io/apimachinery/pkg/types\"\n    appsv1ac \"k8s.io/client-go/applyconfigurations/apps/v1\"\n    \"k8s.io/client-go/kubernetes\"\n)\n\n// ScaleMerge sets spec.replicas with a JSON merge patch: no read-modify-write, no 409s.\nfunc ScaleMerge(ctx context.Context, cs kubernetes.Interface, ns, name string, replicas int32) error {\n    patch := []byte(fmt.Sprintf(`{\"spec\":{\"replicas\":%d}}`, replicas))\n    _, err := cs.AppsV1().Deployments(ns).Patch(ctx, name, types.MergePatchType, patch, metav1.PatchOptions{})\n    return err\n}\n\n// SetImage uses a strategic merge patch: containers merge by name, siblings are untouched.\nfunc SetImage(ctx context.Context, cs kubernetes.Interface, ns, name, container, image string) error {\n    patch := []byte(fmt.Sprintf(\n        `{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":%q,\"image\":%q}]}}}}`, container, image))\n    _, err := cs.AppsV1().Deployments(ns).Patch(ctx, name, types.StrategicMergePatchType, patch, metav1.PatchOptions{})\n    return err\n}\n\n// ScaleApply uses Server-Side Apply: this field manager owns only spec.replicas.\nfunc ScaleApply(ctx context.Context, cs kubernetes.Interface, ns, name string, replicas int32) error {\n    cfg := appsv1ac.Deployment(name, ns).\n        WithSpec(appsv1ac.DeploymentSpec().WithReplicas(replicas))\n    _, err := cs.AppsV1().Deployments(ns).Apply(ctx, cfg,\n        metav1.ApplyOptions{FieldManager: \"autoscaler-lite\", Force: true})\n    return err\n}",
     "lang": "go"
    },
    {
     "t": "Fix \"the object has been modified\" update conflicts",
     "d": "medium",
     "type": "debug",
     "hint": "<ul><li>The error is a <code>409 Conflict</code>: your <code>Update</code> carried a stale <code>resourceVersion</code> (optimistic concurrency).</li><li>Common cause: mutating an object read from the informer cache, or holding an object across a long operation.</li><li>Fix 1: wrap Get + mutate + Update in <code>retry.RetryOnConflict</code>.</li><li>Fix 2: send a patch (merge/SSA) that only touches your fields, so no version precondition is needed.</li><li>In controllers, simply return the error and let the workqueue requeue — the next reconcile reads fresh state.</li></ul>",
     "solution": "package kubeops\n\nimport (\n    \"context\"\n\n    metav1 \"k8s.io/apimachinery/pkg/apis/meta/v1\"\n    \"k8s.io/client-go/kubernetes\"\n    \"k8s.io/client-go/util/retry\"\n)\n\n// LabelNamespace adds a label, re-reading and retrying when another writer wins the race.\nfunc LabelNamespace(ctx context.Context, cs kubernetes.Interface, name, key, value string) error {\n    return retry.RetryOnConflict(retry.DefaultRetry, func() error {\n        ns, err := cs.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{}) // fresh read every attempt\n        if err != nil {\n            return err\n        }\n        if ns.Labels[key] == value {\n            return nil // idempotent: nothing to do\n        }\n        if ns.Labels == nil {\n            ns.Labels = map[string]string{}\n        }\n        ns.Labels[key] = value\n        _, err = cs.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})\n        return err\n    })\n}",
     "lang": "go"
    },
    {
     "t": "Watch pod lifecycle events with a SharedInformerFactory",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>Create the factory with a resync period, get <code>Core().V1().Pods()</code>, register handlers <strong>before</strong> <code>Start</code>.</li><li>In <code>DeleteFunc</code> unwrap <code>cache.DeletedFinalStateUnknown</code>.</li><li>Use <code>signal.NotifyContext</code> for graceful shutdown.</li><li>Answer queries from the lister, never the API server.</li></ul>",
     "solution": "package main\n\nimport (\n    \"context\"\n    \"log\"\n    \"os\"\n    \"os/signal\"\n    \"time\"\n\n    corev1 \"k8s.io/api/core/v1\"\n    \"k8s.io/apimachinery/pkg/labels\"\n    \"k8s.io/client-go/informers\"\n    \"k8s.io/client-go/kubernetes\"\n    \"k8s.io/client-go/tools/cache\"\n    \"k8s.io/client-go/tools/clientcmd\"\n)\n\nfunc main() {\n    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)\n    defer stop()\n\n    cfg, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(\n        clientcmd.NewDefaultClientConfigLoadingRules(), &clientcmd.ConfigOverrides{}).ClientConfig()\n    if err != nil {\n        log.Fatal(err)\n    }\n    cs := kubernetes.NewForConfigOrDie(cfg)\n\n    factory := informers.NewSharedInformerFactoryWithOptions(cs, 10*time.Minute,\n        informers.WithNamespace(\"default\"))\n    podInf := factory.Core().V1().Pods()\n\n    _, err = podInf.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{\n        AddFunc: func(obj any) {\n            p := obj.(*corev1.Pod)\n            log.Printf(\"ADD %s phase=%s\", p.Name, p.Status.Phase)\n        },\n        UpdateFunc: func(oldObj, newObj any) {\n            o, n := oldObj.(*corev1.Pod), newObj.(*corev1.Pod)\n            if o.ResourceVersion == n.ResourceVersion {\n                return // periodic resync, nothing changed\n            }\n            if o.Status.Phase != n.Status.Phase {\n                log.Printf(\"UPDATE %s %s -> %s\", n.Name, o.Status.Phase, n.Status.Phase)\n            }\n        },\n        DeleteFunc: func(obj any) {\n            if t, ok := obj.(cache.DeletedFinalStateUnknown); ok {\n                obj = t.Obj // we missed the delete event; this is the last known state\n            }\n            if p, ok := obj.(*corev1.Pod); ok {\n                log.Printf(\"DELETE %s\", p.Name)\n            }\n        },\n    })\n    if err != nil {\n        log.Fatal(err)\n    }\n\n    factory.Start(ctx.Done())\n    if !cache.WaitForCacheSync(ctx.Done(), podInf.Informer().HasSynced) {\n        log.Fatal(\"cache did not sync\")\n    }\n    all, _ := podInf.Lister().List(labels.Everything())\n    log.Printf(\"synced: %d pods in cache\", len(all))\n\n    <-ctx.Done()\n    factory.Shutdown() // waits for informer goroutines to exit\n}",
     "lang": "go"
    },
    {
     "t": "Build a workqueue-driven controller from scratch",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>Handlers enqueue <code>namespace/name</code> keys only.</li><li>Workers: <code>Get</code> → <code>defer Done</code> → <code>sync</code> → <code>Forget</code> on success or <code>AddRateLimited</code> on error (cap retries with <code>NumRequeues</code>).</li><li><code>sync</code> reads from the lister and treats <code>NotFound</code> as \"deleted, nothing to do\".</li><li>Wait for cache sync before starting N workers; shut the queue down on exit.</li></ul>",
     "solution": "package controller\n\nimport (\n    \"context\"\n    \"errors\"\n    \"fmt\"\n    \"time\"\n\n    apierrors \"k8s.io/apimachinery/pkg/api/errors\"\n    utilruntime \"k8s.io/apimachinery/pkg/util/runtime\"\n    \"k8s.io/apimachinery/pkg/util/wait\"\n    \"k8s.io/client-go/informers\"\n    \"k8s.io/client-go/kubernetes\"\n    corelisters \"k8s.io/client-go/listers/core/v1\"\n    \"k8s.io/client-go/tools/cache\"\n    \"k8s.io/client-go/util/workqueue\"\n    \"k8s.io/klog/v2\"\n)\n\nconst maxRetries = 5\n\ntype Controller struct {\n    cs     kubernetes.Interface\n    lister corelisters.ConfigMapLister\n    synced cache.InformerSynced\n    queue  workqueue.TypedRateLimitingInterface[string]\n}\n\nfunc New(cs kubernetes.Interface, f informers.SharedInformerFactory) (*Controller, error) {\n    inf := f.Core().V1().ConfigMaps()\n    c := &Controller{\n        cs:     cs,\n        lister: inf.Lister(),\n        synced: inf.Informer().HasSynced,\n        queue: workqueue.NewTypedRateLimitingQueueWithConfig(\n            workqueue.DefaultTypedControllerRateLimiter[string](),\n            workqueue.TypedRateLimitingQueueConfig[string]{Name: \"configmaps\"}),\n    }\n    _, err := inf.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{\n        AddFunc:    c.enqueue,\n        UpdateFunc: func(_, obj any) { c.enqueue(obj) },\n        DeleteFunc: c.enqueue,\n    })\n    return c, err\n}\n\nfunc (c *Controller) enqueue(obj any) {\n    key, err := cache.DeletionHandlingMetaNamespaceKeyFunc(obj)\n    if err != nil {\n        utilruntime.HandleError(err)\n        return\n    }\n    c.queue.Add(key)\n}\n\n// Run blocks until ctx is cancelled. Call factory.Start before Run.\nfunc (c *Controller) Run(ctx context.Context, workers int) error {\n    defer utilruntime.HandleCrash()\n    defer c.queue.ShutDown()\n    if !cache.WaitForCacheSync(ctx.Done(), c.synced) {\n        return errors.New(\"timed out waiting for cache sync\")\n    }\n    for i := 0; i < workers; i++ {\n        go wait.UntilWithContext(ctx, c.worker, time.Second)\n    }\n    <-ctx.Done()\n    return nil\n}\n\nfunc (c *Controller) worker(ctx context.Context) {\n    for c.processNext(ctx) {\n    }\n}\n\nfunc (c *Controller) processNext(ctx context.Context) bool {\n    key, shutdown := c.queue.Get()\n    if shutdown {\n        return false\n    }\n    defer c.queue.Done(key) // lets the key be processed again if re-added meanwhile\n\n    err := c.sync(ctx, key)\n    switch {\n    case err == nil:\n        c.queue.Forget(key) // reset backoff\n    case c.queue.NumRequeues(key) < maxRetries:\n        klog.FromContext(ctx).Error(err, \"sync failed, requeueing\", \"key\", key)\n        c.queue.AddRateLimited(key)\n    default:\n        c.queue.Forget(key)\n        utilruntime.HandleError(fmt.Errorf(\"dropping %q after %d retries: %w\", key, maxRetries, err))\n    }\n    return true\n}\n\n// sync is level-triggered and idempotent: it only looks at current state.\nfunc (c *Controller) sync(ctx context.Context, key string) error {\n    ns, name, err := cache.SplitMetaNamespaceKey(key)\n    if err != nil {\n        return nil // malformed key: retrying will never help\n    }\n    cm, err := c.lister.ConfigMaps(ns).Get(name)\n    if apierrors.IsNotFound(err) {\n        return nil // deleted; dependents are removed by the garbage collector\n    }\n    if err != nil {\n        return err\n    }\n    desired := cm.DeepCopy() // never mutate the cached object\n    klog.FromContext(ctx).V(2).Info(\"reconciling\", \"key\", key, \"keys\", len(desired.Data))\n    return nil // compute desired children and create/patch them here\n}",
     "lang": "go"
    },
    {
     "t": "Debug a reconcile hot loop that floods the API server",
     "d": "medium",
     "type": "debug",
     "hint": "<ul><li>Symptom: reconcile runs continuously, API server audit logs show endless updates, <code>workqueue_adds_total</code> climbs.</li><li>Cause 1: writing status (or a timestamp) on every reconcile → status update event → reconcile again.</li><li>Cause 2: always calling <code>Update</code> on children even when nothing changed, or non-deterministic output (map iteration order, <code>time.Now()</code>).</li><li>Fix: compare desired vs actual before writing (<code>equality.Semantic.DeepEqual</code>), use SSA, and filter primary events with <code>predicate.GenerationChangedPredicate</code>.</li></ul>",
     "solution": "// 1) Ignore status-only/metadata-only updates of the primary resource.\nfunc (r *WebAppReconciler) SetupWithManager(mgr ctrl.Manager) error {\n    return ctrl.NewControllerManagedBy(mgr).\n        For(&webv1.WebApp{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).\n        Owns(&appsv1.Deployment{}).\n        Complete(r)\n}\n\n// 2) Write status only when it actually changed (no timestamps in status!).\nfunc (r *WebAppReconciler) updateStatus(ctx context.Context, app *webv1.WebApp, newStatus webv1.WebAppStatus) error {\n    if equality.Semantic.DeepEqual(app.Status, newStatus) {\n        return nil\n    }\n    orig := app.DeepCopy()\n    app.Status = newStatus\n    return r.Status().Patch(ctx, app, client.MergeFrom(orig))\n}\n\n// 3) Child objects: CreateOrUpdate only issues an Update when the mutate func\n//    produced a semantic difference; keep the mutate func deterministic\n//    (sort map keys, no time.Now(), no random names).",
     "lang": "go"
    },
    {
     "t": "Write a controller-runtime reconciler that owns a Deployment",
     "d": "hard",
     "type": "coding",
     "hint": "<ul><li>Get the <code>WebApp</code>; return <code>client.IgnoreNotFound(err)</code> when it is gone.</li><li>Use <code>controllerutil.CreateOrUpdate</code> with a deterministic mutate func and <code>SetControllerReference</code> so GC and <code>Owns()</code> work.</li><li>Write <code>status.observedGeneration</code>, available replicas and a <code>Ready</code> condition through the status subresource.</li><li>Declare RBAC with markers; wire with <code>For</code>/<code>Owns</code>.</li></ul>",
     "solution": "package controller\n\nimport (\n    \"context\"\n\n    appsv1 \"k8s.io/api/apps/v1\"\n    corev1 \"k8s.io/api/core/v1\"\n    \"k8s.io/apimachinery/pkg/api/meta\"\n    metav1 \"k8s.io/apimachinery/pkg/apis/meta/v1\"\n    \"k8s.io/apimachinery/pkg/runtime\"\n    \"k8s.io/utils/ptr\"\n    ctrl \"sigs.k8s.io/controller-runtime\"\n    \"sigs.k8s.io/controller-runtime/pkg/client\"\n    \"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil\"\n    logf \"sigs.k8s.io/controller-runtime/pkg/log\"\n\n    webv1 \"github.com/acme/webapp-operator/api/v1alpha1\"\n)\n\ntype WebAppReconciler struct {\n    client.Client\n    Scheme *runtime.Scheme\n}\n\n// +kubebuilder:rbac:groups=web.example.com,resources=webapps,verbs=get;list;watch\n// +kubebuilder:rbac:groups=web.example.com,resources=webapps/status,verbs=get;update;patch\n// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete\n\nfunc (r *WebAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {\n    log := logf.FromContext(ctx)\n\n    var app webv1.WebApp\n    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {\n        return ctrl.Result{}, client.IgnoreNotFound(err) // deleted: GC removes children\n    }\n\n    dep := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: app.Name, Namespace: app.Namespace}}\n    op, err := controllerutil.CreateOrUpdate(ctx, r.Client, dep, func() error {\n        lbls := map[string]string{\"app.kubernetes.io/name\": app.Name, \"app.kubernetes.io/managed-by\": \"webapp-operator\"}\n        if dep.CreationTimestamp.IsZero() {\n            dep.Spec.Selector = &metav1.LabelSelector{MatchLabels: lbls} // selector is immutable\n        }\n        dep.Spec.Replicas = ptr.To(app.Spec.Replicas)\n        dep.Spec.Template.Labels = lbls\n        dep.Spec.Template.Spec.Containers = []corev1.Container{{\n            Name:  \"web\",\n            Image: app.Spec.Image,\n            Ports: []corev1.ContainerPort{{Name: \"http\", ContainerPort: 8080}},\n        }}\n        return controllerutil.SetControllerReference(&app, dep, r.Scheme)\n    })\n    if err != nil {\n        return ctrl.Result{}, err // requeued with exponential backoff\n    }\n    if op != controllerutil.OperationResultNone {\n        log.Info(\"deployment reconciled\", \"operation\", op)\n    }\n\n    orig := app.DeepCopy()\n    cond := metav1.Condition{Type: \"Ready\", Status: metav1.ConditionFalse, Reason: \"Progressing\",\n        Message: \"waiting for replicas\", ObservedGeneration: app.Generation}\n    if dep.Status.AvailableReplicas >= app.Spec.Replicas {\n        cond.Status, cond.Reason, cond.Message = metav1.ConditionTrue, \"Available\", \"all replicas available\"\n    }\n    app.Status.ObservedGeneration = app.Generation\n    app.Status.AvailableReplicas = dep.Status.AvailableReplicas\n    meta.SetStatusCondition(&app.Status.Conditions, cond) // only bumps lastTransitionTime on change\n    if err := r.Status().Patch(ctx, &app, client.MergeFrom(orig)); err != nil {\n        return ctrl.Result{}, err\n    }\n    return ctrl.Result{}, nil // Owns() re-triggers us when the Deployment status changes\n}\n\nfunc (r *WebAppReconciler) SetupWithManager(mgr ctrl.Manager) error {\n    return ctrl.NewControllerManagedBy(mgr).\n        For(&webv1.WebApp{}).\n        Owns(&appsv1.Deployment{}).\n        Complete(r)\n}",
     "lang": "go"
    },
    {
     "t": "Clean up external resources with a finalizer",
     "d": "hard",
     "type": "coding",
     "hint": "<ul><li>Not being deleted: ensure the finalizer is present (<code>AddFinalizer</code> returns true if it changed → <code>Update</code>), then reconcile the external resource.</li><li>Being deleted (<code>deletionTimestamp</code> set): run idempotent cleanup, then <code>RemoveFinalizer</code> + <code>Update</code>.</li><li>Cleanup errors → return the error so it retries; the object cannot disappear before cleanup succeeds.</li><li>Treat \"already gone\" in the external API as success, or you will block deletion forever.</li></ul>",
     "solution": "package controller\n\nimport (\n    \"context\"\n    \"time\"\n\n    \"k8s.io/apimachinery/pkg/runtime\"\n    ctrl \"sigs.k8s.io/controller-runtime\"\n    \"sigs.k8s.io/controller-runtime/pkg/client\"\n    \"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil\"\n\n    webv1 \"github.com/acme/webapp-operator/api/v1alpha1\"\n)\n\nconst dnsFinalizer = \"web.example.com/dns-cleanup\"\n\n// DNSProvider must be idempotent: deleting a missing record returns nil.\ntype DNSProvider interface {\n    UpsertRecord(ctx context.Context, host, target string) error\n    DeleteRecord(ctx context.Context, host string) error\n}\n\ntype DNSReconciler struct {\n    client.Client\n    Scheme *runtime.Scheme\n    DNS    DNSProvider\n}\n\nfunc (r *DNSReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {\n    var app webv1.WebApp\n    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {\n        return ctrl.Result{}, client.IgnoreNotFound(err)\n    }\n\n    if !app.DeletionTimestamp.IsZero() { // being deleted\n        if controllerutil.ContainsFinalizer(&app, dnsFinalizer) {\n            if err := r.DNS.DeleteRecord(ctx, app.Spec.Host); err != nil {\n                return ctrl.Result{}, err // retry; object stays until cleanup succeeds\n            }\n            controllerutil.RemoveFinalizer(&app, dnsFinalizer)\n            if err := r.Update(ctx, &app); err != nil {\n                return ctrl.Result{}, err\n            }\n        }\n        return ctrl.Result{}, nil\n    }\n\n    if controllerutil.AddFinalizer(&app, dnsFinalizer) { // true only if it was missing\n        if err := r.Update(ctx, &app); err != nil {\n            return ctrl.Result{}, err\n        }\n    }\n    if err := r.DNS.UpsertRecord(ctx, app.Spec.Host, app.Spec.Target); err != nil {\n        return ctrl.Result{}, err\n    }\n    // External state can drift without any Kubernetes event: re-check periodically.\n    return ctrl.Result{RequeueAfter: 10 * time.Minute}, nil\n}",
     "lang": "go"
    },
    {
     "t": "Integration-test a reconciler with envtest",
     "d": "hard",
     "type": "coding",
     "hint": "<ul><li><code>envtest.Environment</code> with <code>CRDDirectoryPaths</code> starts kube-apiserver + etcd (binaries via <code>setup-envtest</code>, path in <code>KUBEBUILDER_ASSETS</code>).</li><li>Register client-go and your API types in a scheme; start a manager with your reconciler in a goroutine.</li><li>Assert with an uncached client and polling (or Gomega <code>Eventually</code>) — reconciliation is asynchronous.</li><li>Remember: no kube-controller-manager, so no GC and Deployments never get pods; test owner refs, not cascading deletes.</li></ul>",
     "solution": "package controller\n\nimport (\n    \"path/filepath\"\n    \"testing\"\n    \"time\"\n\n    appsv1 \"k8s.io/api/apps/v1\"\n    metav1 \"k8s.io/apimachinery/pkg/apis/meta/v1\"\n    \"k8s.io/apimachinery/pkg/runtime\"\n    \"k8s.io/apimachinery/pkg/types\"\n    clientgoscheme \"k8s.io/client-go/kubernetes/scheme\"\n    ctrl \"sigs.k8s.io/controller-runtime\"\n    \"sigs.k8s.io/controller-runtime/pkg/client\"\n    \"sigs.k8s.io/controller-runtime/pkg/envtest\"\n    metricsserver \"sigs.k8s.io/controller-runtime/pkg/metrics/server\"\n\n    webv1 \"github.com/acme/webapp-operator/api/v1alpha1\"\n)\n\nfunc TestWebAppCreatesOwnedDeployment(t *testing.T) {\n    env := &envtest.Environment{\n        CRDDirectoryPaths:     []string{filepath.Join(\"..\", \"..\", \"config\", \"crd\", \"bases\")},\n        ErrorIfCRDPathMissing: true,\n    }\n    cfg, err := env.Start()\n    if err != nil {\n        t.Fatalf(\"start envtest: %v\", err)\n    }\n    t.Cleanup(func() { _ = env.Stop() })\n\n    scheme := runtime.NewScheme()\n    if err := clientgoscheme.AddToScheme(scheme); err != nil {\n        t.Fatal(err)\n    }\n    if err := webv1.AddToScheme(scheme); err != nil {\n        t.Fatal(err)\n    }\n\n    mgr, err := ctrl.NewManager(cfg, ctrl.Options{Scheme: scheme, Metrics: metricsserver.Options{BindAddress: \"0\"}})\n    if err != nil {\n        t.Fatal(err)\n    }\n    if err := (&WebAppReconciler{Client: mgr.GetClient(), Scheme: scheme}).SetupWithManager(mgr); err != nil {\n        t.Fatal(err)\n    }\n    ctx := t.Context() // Go 1.24+: cancelled before Cleanup funcs run\n    go func() {\n        if err := mgr.Start(ctx); err != nil {\n            t.Errorf(\"manager: %v\", err)\n        }\n    }()\n\n    c, err := client.New(cfg, client.Options{Scheme: scheme}) // uncached client for assertions\n    if err != nil {\n        t.Fatal(err)\n    }\n    app := &webv1.WebApp{\n        ObjectMeta: metav1.ObjectMeta{Name: \"demo\", Namespace: \"default\"},\n        Spec:       webv1.WebAppSpec{Image: \"nginx:1.27\", Replicas: 2},\n    }\n    if err := c.Create(ctx, app); err != nil {\n        t.Fatal(err)\n    }\n\n    var dep appsv1.Deployment\n    key := types.NamespacedName{Name: \"demo\", Namespace: \"default\"}\n    deadline := time.Now().Add(10 * time.Second)\n    for {\n        if err := c.Get(ctx, key, &dep); err == nil {\n            break\n        } else if time.Now().After(deadline) {\n            t.Fatalf(\"deployment never created: %v\", err)\n        }\n        time.Sleep(100 * time.Millisecond)\n    }\n    if got := *dep.Spec.Replicas; got != 2 {\n        t.Errorf(\"replicas = %d, want 2\", got)\n    }\n    if len(dep.OwnerReferences) != 1 || dep.OwnerReferences[0].UID != app.UID {\n        t.Errorf(\"expected controller owner reference to WebApp, got %+v\", dep.OwnerReferences)\n    }\n}",
     "lang": "go"
    },
    {
     "t": "Design a highly available operator with leader election and a validating webhook",
     "d": "hard",
     "type": "design",
     "hint": "<ul><li><strong>Topology</strong>: Deployment with 2–3 replicas, PodDisruptionBudget, anti-affinity across zones; leader election via Lease so one replica reconciles while all serve webhooks.</li><li><strong>Webhook</strong>: Service → all replicas, TLS cert from cert-manager with CA injection, <code>failurePolicy: Fail</code> only for your CRD group, exclude <code>kube-system</code>, <code>timeoutSeconds</code> ≤ 5, readiness probe gates traffic.</li><li><strong>Scale</strong>: filtered/namespaced caches, label-selected informers, <code>MaxConcurrentReconciles</code>, raise QPS/Burst, metadata-only watches for big types.</li><li><strong>Safety</strong>: idempotent reconcile, conflict-tolerant writes, finalizers for external resources, <code>observedGeneration</code> + conditions, metrics (<code>controller_runtime_reconcile_errors_total</code>, queue depth/latency) and alerts.</li><li><strong>Failure modes</strong>: leader partition (stops after RenewDeadline), webhook down (Fail blocks CRD writes only), upgrade/CRD versioning with conversion webhooks.</li></ul>"
    }
   ],
   "interviewFocus": [
    {
     "q": "Why do controllers use informers and a workqueue instead of polling or a raw watch?",
     "a": "<p>A raw <code>Watch</code> alone is fragile (it expires, disconnects, and gives you no local state), and polling hammers the API server and etcd. Informers do <strong>one List + one long-lived Watch</strong> per resource type, keep an <strong>indexed local cache</strong> and automatically re-list on <code>410 Gone</code>. Shared informers let every controller in the process share that watch.</p><p>The <strong>workqueue</strong> decouples event delivery from processing:</p><ul><li>Handlers enqueue only keys, so bursts of events for one object <strong>coalesce</strong> into one reconcile.</li><li>A key is <strong>never processed by two workers concurrently</strong>; if re-added while processing it is re-queued after <code>Done</code>.</li><li><strong>Per-item exponential backoff</strong> (5 ms → ~16 min by default) plus an overall token bucket protects the API server on errors.</li></ul><p>Result: low API load, ordering-independence and natural retry, which together enable level-triggered reconciliation.</p>"
    },
    {
     "q": "Explain level-triggered reconciliation. What happens if your operator crashes mid-reconcile or misses events?",
     "a": "<p>Edge-triggered logic reacts to <em>what changed</em> (an event); level-triggered logic reacts to <em>what is</em> (current state). Reconcile receives only a name and recomputes desired state from the spec and observed children, so a missed or duplicated event cannot corrupt state.</p><ul><li>On crash/restart, informers re-list and <strong>every object is enqueued</strong>, so half-done work is completed by the next reconcile.</li><li>This requires <strong>idempotency</strong>: deterministic child names, create-or-update/SSA, treating <code>AlreadyExists</code>/<code>NotFound</code> as success, and storing progress in the API (status/annotations), never only in memory.</li><li>Periodic resync / <code>RequeueAfter</code> covers drift in external systems that emit no Kubernetes events.</li></ul><p>Trade-off: reconcile does more work per call, so keep it cheap (cache reads) and make writes conditional on real differences.</p>"
    },
    {
     "q": "How do owner references, garbage collection and finalizers interact during deletion?",
     "a": "<p><strong>Owner references</strong> link dependents to owners. The garbage collector in kube-controller-manager watches them: when an owner is gone, dependents are deleted according to the <strong>propagation policy</strong>:</p><ul><li><code>Background</code>: owner deleted immediately, GC deletes dependents afterwards.</li><li><code>Foreground</code>: owner gets <code>deletionTimestamp</code> and the <code>foregroundDeletion</code> finalizer; dependents with <code>blockOwnerDeletion: true</code> are deleted first.</li><li><code>Orphan</code>: dependents keep running, owner refs are removed.</li></ul><p><strong>Finalizers</strong> are for things GC cannot see (cloud LBs, DNS, buckets). Deleting an object with finalizers only sets <code>deletionTimestamp</code>; the object is read-only for new finalizers and stays until all finalizers are removed. Pitfalls: a finalizer whose controller is uninstalled blocks deletion forever (namespaces stuck in <code>Terminating</code>); cleanup must be idempotent; cross-namespace owner refs are invalid and get ignored or cause premature deletion.</p>"
    },
    {
     "q": "controller-runtime reads come from a cache. How do you deal with stale reads and update conflicts?",
     "a": "<p>The default client reads from the informer cache, which lags the API server by milliseconds to seconds. Consequences and mitigations:</p><ul><li><strong>Conflicts</strong>: an <code>Update</code> built from a stale object fails with <code>409</code>. In a reconciler just <strong>return the error</strong>; the backoff requeue reads fresher state. For one-off writes use <code>retry.RetryOnConflict</code>.</li><li><strong>Avoid needing the latest version</strong>: <code>Patch</code> with <code>client.MergeFrom</code> (optionally with optimistic lock) or <strong>Server-Side Apply</strong> only touches your fields.</li><li><strong>Duplicate creates</strong>: you may not see a child you just created; deterministic names make the second create return <code>AlreadyExists</code>, which is harmless. <code>generateName</code> in a controller is a bug magnet.</li><li><strong>Read-after-write</strong>: when you truly need it, use <code>mgr.GetAPIReader()</code> (uncached) sparingly.</li><li>Use <code>status.observedGeneration</code> so clients know whether status reflects the current spec.</li></ul>"
    },
    {
     "q": "How would you make an operator highly available and safe to run with multiple replicas?",
     "a": "<p>Run 2–3 replicas spread across zones with a PodDisruptionBudget and enable <strong>leader election</strong> (<code>coordination.k8s.io</code> Lease). Only the leader starts controllers; webhooks and metrics run on all replicas.</p><ul><li><strong>Timings</strong>: LeaseDuration 15s, RenewDeadline 10s, RetryPeriod 2s. A partitioned leader stops when it cannot renew within RenewDeadline (controller-runtime exits), and a candidate acquires after LeaseDuration — fail-over is seconds, not instant.</li><li><strong>Split-brain</strong>: leases depend on clock-rate assumptions; idempotent reconcile + resourceVersion preconditions make a brief overlap harmless. For external systems add fencing tokens.</li><li><strong>Graceful handoff</strong>: <code>LeaderElectionReleaseOnCancel</code> so rolling updates do not wait a full lease.</li><li><strong>Scaling out</strong> beyond one leader: shard by namespace/label across separate leases, or increase <code>MaxConcurrentReconciles</code> first.</li></ul>"
    }
   ],
   "quiz": [
    {
     "q": "Which function builds a rest.Config from the ServiceAccount mounted in a pod?",
     "a": "rest.InClusterConfig() — it reads the token/CA under /var/run/secrets/kubernetes.io/serviceaccount and KUBERNETES_SERVICE_HOST/PORT."
    },
    {
     "q": "When would you use the dynamic client instead of the typed clientset?",
     "a": "For resources you have no generated Go types for (third-party CRDs) or generic tooling that handles arbitrary GroupVersionResources; it returns unstructured.Unstructured objects."
    },
    {
     "q": "Why does a strategic merge patch exist when JSON merge patch already does?",
     "a": "JSON merge patch replaces lists wholesale; strategic merge patch uses patchMergeKey metadata on built-in types to merge list items by key (e.g. containers by name). It does not work for CRDs."
    },
    {
     "q": "What does an informer resync actually do?",
     "a": "It re-delivers every object in the local cache to the handlers as an Update event at the resync interval; it does not re-list from the API server."
    },
    {
     "q": "What does workqueue.Forget(key) do versus Done(key)?",
     "a": "Done marks processing finished (so the key can be handed out again). Forget clears the rate limiter backoff history for the key; call it after success or when giving up."
    },
    {
     "q": "In controller-runtime, what is the effect of returning a non-nil error from Reconcile?",
     "a": "The request is requeued with per-item exponential backoff and the error is logged/counted in metrics; any Result value is ignored."
    },
    {
     "q": "Which Kubernetes object does client-go leader election use today?",
     "a": "A Lease in the coordination.k8s.io/v1 API group, holding holderIdentity, leaseDurationSeconds and renewTime."
    },
    {
     "q": "In what order do mutating and validating admission webhooks run?",
     "a": "Mutating webhooks run first (and may be reinvoked), then schema validation, then validating webhooks and ValidatingAdmissionPolicies before the object is persisted."
    }
   ],
   "resources": [
    {
     "title": "client-go package documentation",
     "url": "https://pkg.go.dev/k8s.io/client-go",
     "type": "docs"
    },
    {
     "title": "The Kubebuilder Book",
     "url": "https://book.kubebuilder.io/",
     "type": "book"
    },
    {
     "title": "kubernetes/sample-controller (reference informer + workqueue controller)",
     "url": "https://github.com/kubernetes/sample-controller",
     "type": "article"
    },
    {
     "title": "Kubernetes Docs — Dynamic Admission Control",
     "url": "https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/",
     "type": "docs"
    }
   ]
  },
  {
   "n": 13,
   "title": "Go Runtime Internals & Performance",
   "group": "Cloud-Native Go (Weeks 9–14)",
   "summary": "How the Go runtime really works — GMP scheduler, allocator, escape analysis and the concurrent GC — plus the mechanical-sympathy and profiling skills (benchmarks, benchstat, pprof, trace, PGO) that senior interviews use to separate users of Go from engineers who can make it fast.",
   "topics": [
    {
     "title": "The GMP scheduler: goroutines, threads & processors",
     "def": "<p>The runtime multiplexes many goroutines onto few OS threads with the <strong>GMP</strong> model:</p><ul><li><strong>G</strong> — a goroutine: its own growable stack, PC and status. The stack is at least 2 KiB; since Go 1.19 new goroutines start at the average stack size the GC has observed, and stacks grow and shrink by copying. Creating a goroutine costs well under a microsecond. A Linux thread needs a system call and reserves a much larger stack, typically 8 MiB of virtual memory (<code>ulimit -s</code>).</li><li><strong>M</strong> — an OS thread (\"machine\"). It must hold a P to run Go code.</li><li><strong>P</strong> — a logical processor/scheduling context with a lock-free <strong>local run queue</strong> (256 slots) plus a <code>runnext</code> slot. There are exactly <code>GOMAXPROCS</code> Ps. Since <strong>Go 1.25</strong>, the default <code>GOMAXPROCS</code> on Linux respects the container cgroup CPU limit (rounded up, minimum 2). It applies only when the module's <code>go</code> line is at least 1.25 and <code>GOMAXPROCS</code> is not set, and the runtime updates it if the limit changes.</li></ul><p><strong>Finding work</strong>: <code>runnext</code> → local queue → global queue (also checked every 61 ticks for fairness) → netpoller → <strong>work stealing</strong> (take half of a random P&#39;s queue). Idle Ms spin briefly before parking to cut wake-up latency.</p><ul><li><strong>Preemption</strong>: cooperative at function calls plus <strong>asynchronous preemption</strong> (Go 1.14+): <code>sysmon</code> flags a G running for more than 10 ms and signals its thread (SIGURG), so tight loops cannot starve the GC or other goroutines.</li><li><strong>Blocking syscalls</strong>: the M blocks with its G; <code>sysmon</code> retakes the P (after ≥20 µs) and hands it to another M, so other goroutines keep running. On return the G tries to reacquire a P or is queued globally.</li><li><strong>Netpoller</strong>: sockets are non-blocking (epoll/kqueue/IOCP). A goroutine waiting on the network is <em>parked</em> without holding an M — 100k idle connections cost only their stacks.</li></ul>",
     "interview": "Classic probes: \"goroutine vs thread\", \"what happens on a blocking file read vs a socket read\", \"why did GOMAXPROCS cause CPU throttling in containers before Go 1.25 (it used the host CPU count; teams used uber-go/automaxprocs)\", and \"can a tight loop starve other goroutines\" (not since async preemption in 1.14). Mention GODEBUG=schedtrace for live scheduler stats.",
     "examples": [
      {
       "label": "Observe the scheduler",
       "lang": "bash",
       "code": "# Print scheduler state every second: gomaxprocs, idle Ps, threads, run queue lengths\nGODEBUG=schedtrace=1000 ./server\n# SCHED 1004ms: gomaxprocs=4 idleprocs=1 threads=9 spinningthreads=0 needspinning=0 idlethreads=3 runqueue=0 [2 0 1 0]\n\n# Go 1.25+: GOMAXPROCS follows the cgroup CPU limit; opt out per binary\nGODEBUG=containermaxprocs=0,updatemaxprocs=0 ./server"
      },
      {
       "label": "Parked vs blocked: network wait does not consume a thread",
       "lang": "go",
       "code": "func main() {\n    ln, _ := net.Listen(\"tcp\", \"127.0.0.1:0\")\n    for range 10_000 {\n        go func() {\n            c, err := net.Dial(\"tcp\", ln.Addr().String())\n            if err != nil {\n                return\n            }\n            buf := make([]byte, 1)\n            c.Read(buf) // parked on the netpoller, no M held\n        }()\n    }\n    time.Sleep(time.Second)\n    // 10k goroutines blocked in Read, but only a handful of OS threads:\n    fmt.Println(\"goroutines:\", runtime.NumGoroutine(),\n        \"threads:\", pprof.Lookup(\"threadcreate\").Count())\n}"
      }
     ]
    },
    {
     "title": "Memory allocator & escape analysis",
     "def": "<p>The allocator is TCMalloc-inspired and built for concurrency:</p><ul><li><strong>mcache</strong> — per-P cache of spans; most small allocations take no lock.</li><li><strong>mcentral</strong> — one per <em>span class</em>; refills mcaches (locked).</li><li><strong>mheap</strong> — global page heap, obtains memory from the OS in arenas (64 MiB on 64-bit Linux).</li><li><strong>Size classes</strong>: 68 classes up to 32 KiB; each comes in <em>scan</em> and <em>noscan</em> flavours so pointer-free objects are never scanned by the GC. Objects &gt;32 KiB are allocated directly from the mheap; pointer-free objects &lt;16 B are packed together by the <strong>tiny allocator</strong>.</li></ul><p><strong>Escape analysis</strong> (compile time) decides stack vs heap. Stack allocation is nearly free and needs no GC; a heap allocation costs allocator time <em>and</em> future GC work. A value escapes when the compiler cannot prove it dies with the frame:</p><ul><li>returning a pointer to a local (<code>return &amp;T{}</code>), storing it in a global, heap object or channel (<code>leaking param</code>);</li><li>converting to an interface passed to code that retains it (<code>fmt.Println(x)</code> → <code>x escapes to heap</code>);</li><li>closures that outlive the frame (<code>moved to heap: c</code>);</li><li>very large values (<code>make([]byte, 128&lt;&lt;10)</code>). Variable-size <code>make([]T, n)</code> that does not escape now uses a small stack buffer when it fits (Go 1.25+).</li></ul><p>Inspect with <code>go build -gcflags=-m</code> (<code>-m=2</code> shows the reason chain). Reduce allocations with preallocated capacity, caller-supplied buffers (<code>Read(p []byte)</code> style APIs), <code>strconv.Append*</code> instead of <code>fmt.Sprintf</code>, and avoiding needless <code>[]byte</code> ↔ <code>string</code> conversions.</p>",
     "interview": "Be able to read -gcflags=-m output and explain each line. Interviewers like: \"why can returning a pointer be slower than returning a struct?\", \"why does passing a value to fmt.Println allocate?\", and \"why do interface method calls hurt escape analysis\" (dynamic dispatch hides the callee; PGO devirtualization can help). Always back claims with -benchmem numbers.",
     "examples": [
      {
       "label": "Reading escape analysis output",
       "lang": "go",
       "code": "// go build -gcflags=-m ./escape\ntype Point struct{ X, Y int }\n\nvar last *Point\n\nfunc NewPointValue(x, y int) Point { return Point{x, y} } // no allocation\n\nfunc NewPointPtr(x, y int) *Point { return &Point{x, y} } // &Point{...} escapes to heap\n\nfunc Log(p Point) { fmt.Println(p) } // p escapes to heap (boxed into an interface)\n\nfunc Counter() func() int {\n    c := 0 // moved to heap: c (captured by a closure that outlives the frame)\n    return func() int { c++; return c }\n}\n\nfunc Remember(p *Point) { last = p } // leaking param: p\n\nfunc Read(p *Point) int { return p.X + p.Y } // p does not escape\n\nfunc Big() int {\n    s := make([]byte, 128<<10) // escapes to heap: too large for the stack\n    return len(s)\n}"
      }
     ]
    },
    {
     "title": "The garbage collector: tri-color marking, GOGC, GOMEMLIMIT & sync.Pool",
     "def": "<p>Go uses a <strong>concurrent, non-moving, non-generational tri-color mark-and-sweep</strong> collector optimised for low latency.</p><ul><li><strong>Cycle</strong>: short stop-the-world (sweep termination) → <strong>concurrent mark</strong> (dedicated background workers use ~25% of GOMAXPROCS) → short STW mark termination → <strong>concurrent, lazy sweep</strong>. Pauses are typically well under a millisecond.</li><li><strong>Tri-color</strong>: white = not yet seen (garbage at the end), grey = reachable but children unscanned, black = scanned. The invariant \"no black object points to a white one\" is maintained during concurrent mutation by the <strong>hybrid write barrier</strong> (Dijkstra insertion + Yuasa deletion, Go 1.8), which removed stack re-scanning.</li><li><strong>Pacer &amp; GOGC</strong>: heap goal ≈ live heap + (live heap + GC roots) × GOGC/100. Default <code>GOGC=100</code> lets the heap grow to about 2× the live heap. If a goroutine allocates faster than marking progresses, it is drafted into <strong>mark assists</strong> — a common hidden source of tail latency.</li><li><strong>GOMEMLIMIT</strong> (Go 1.19): a soft limit on total runtime memory. The GC runs more often near the limit and caps its own CPU (~50%) to avoid a death spiral. Set it to ~90% of the container limit; <code>GOGC=off</code> + <code>GOMEMLIMIT</code> means \"collect only near the limit\" (dangerous if live heap approaches the limit). It replaces the old heap-ballast hack.</li><li><strong>Green Tea GC</strong> (<code>GOEXPERIMENT=greenteagc</code> in Go 1.25, <strong>default since Go 1.26</strong>; opt out with <code>GOEXPERIMENT=nogreenteagc</code> while that flag exists): the mark phase no longer chases individual small objects across the heap. It queues whole <em>spans</em> (pages of small objects) and scans the marked objects of each span together. Better cache locality and less pointer chasing cut GC CPU; the Go team reports roughly 10–40% less GC overhead on GC-heavy programs. It is still concurrent, non-moving and non-generational, and the GOGC/GOMEMLIMIT knobs are unchanged.</li><li><strong>sync.Pool</strong>: per-P caches of reusable objects, emptied across GC cycles (victim cache since Go 1.13). Pool pointers (<code>*bytes.Buffer</code>), <code>Reset</code> before reuse, and do not return oversized buffers.</li></ul><p>Tuning order: <strong>allocate less</strong> first, then trade memory for CPU with GOGC, then make memory safe with GOMEMLIMIT.</p>",
     "interview": "Expect to explain the write barrier and why Go chose a non-generational, non-moving design (low latency, cheap goroutine stacks, interior pointers, escape analysis already keeps short-lived data on the stack). Know how to read GODEBUG=gctrace=1 output and how GOMEMLIMIT prevents container OOMKills without the ballast trick.",
     "examples": [
      {
       "label": "Reading gctrace and setting limits",
       "lang": "bash",
       "code": "GODEBUG=gctrace=1 GOMEMLIMIT=900MiB GOGC=150 ./server\n# gc 41 @18.204s 3%: 0.041+5.1+0.022 ms clock, 0.33+1.2/9.8/14+0.18 ms cpu, 412->420->198 MB, 425 MB goal, 0 MB stacks, 0 MB globals, 8 P\n#  3%           = total CPU spent in GC since start\n#  0.041/0.022  = the two STW phases (ms); 5.1 = concurrent mark\n#  412->420->198 = heap at GC start -> at GC end -> live heap after marking\n#  425 MB goal  = pacer target for this cycle"
      },
      {
       "label": "sync.Pool for reusable buffers",
       "lang": "go",
       "code": "var bufPool = sync.Pool{New: func() any { return new(bytes.Buffer) }}\n\nfunc render(w io.Writer, v any) error {\n    buf := bufPool.Get().(*bytes.Buffer)\n    buf.Reset()\n    defer func() {\n        if buf.Cap() <= 64<<10 { // do not pin huge buffers in the pool\n            bufPool.Put(buf)\n        }\n    }()\n    if err := json.NewEncoder(buf).Encode(v); err != nil {\n        return err\n    }\n    _, err := w.Write(buf.Bytes())\n    return err\n}"
      }
     ]
    },
    {
     "title": "CPU caches & mechanical sympathy",
     "def": "<p>Main memory is ~100× slower than L1 cache, so data layout often matters more than instruction count. CPUs move memory in <strong>64-byte cache lines</strong> (128 B effective on some Intel adjacent-line prefetchers and Apple M-series).</p><ul><li><strong>False sharing</strong>: two cores writing different variables that live on the same cache line keep invalidating each other (MESI ping-pong). Per-worker counters in a <code>[]int64</code> are the classic case. Fix by padding to a cache line (<code>_ [56]byte</code> or <code>cpu.CacheLinePad</code> from <code>golang.org/x/sys/cpu</code>) or, better, accumulate locally and publish once.</li><li><strong>Struct layout</strong>: Go never reorders fields. Each field is aligned to its size, so <code>bool, int64, bool</code> wastes 14 bytes of padding. Order fields from largest to smallest (and pointers first, which shortens the GC-scanned prefix). Check with <code>unsafe.Sizeof</code>/<code>unsafe.Offsetof</code> or the <code>fieldalignment</code> analyzer.</li><li><strong>Data-oriented layout</strong>: a slice of structs (AoS) drags unused fields through the cache when a hot loop reads one field; a struct of slices (SoA) streams exactly what is needed. Prefer <code>[]T</code> over <code>[]*T</code> — contiguous values beat pointer chasing and reduce GC work.</li><li><strong>Branch prediction</strong>: unpredictable branches cost ~15–20 cycles on a mispredict; sorted data or branch-free formulations can be several times faster in tight loops.</li><li><strong>Bounds-check elimination (BCE)</strong>: the compiler drops checks it can prove safe. Hint it with an early <code>_ = b[7]</code> or by ranging over the slice; list remaining checks with <code>-gcflags=-d=ssa/check_bce</code>.</li></ul>",
     "interview": "Senior-level probes: \"why is iterating a [][]int column-wise slower than row-wise?\", \"how would you detect false sharing?\" (benchmark with padding vs without; perf c2c on Linux), and \"how do you shrink a hot struct?\". Quote numbers: cache line 64 B, L1 ~1 ns, RAM ~100 ns.",
     "examples": [
      {
       "label": "Padding vs field ordering",
       "lang": "go",
       "code": "type Bad struct { // unsafe.Sizeof = 40\n    Active bool    // 1 + 7 padding\n    ID     int64   // 8\n    Done   bool    // 1 + 3 padding\n    Count  int32   // 4\n    Flag   bool    // 1 + 7 padding\n    Ptr    *string // 8\n}\n\ntype Good struct { // unsafe.Sizeof = 24 (same fields, largest first)\n    ID     int64\n    Ptr    *string\n    Count  int32\n    Active bool\n    Done   bool\n    Flag   bool\n}\n\n// Per-core counter that owns a full cache line: no false sharing.\ntype paddedCounter struct {\n    n atomic.Int64\n    _ [56]byte\n}"
      },
      {
       "label": "Bounds-check elimination hint",
       "lang": "go",
       "code": "// go build -gcflags=-d=ssa/check_bce ./... reports remaining checks\nfunc beUint64(b []byte) uint64 {\n    _ = b[7] // one check up front proves b[0..7] are in range\n    return uint64(b[7]) | uint64(b[6])<<8 | uint64(b[5])<<16 | uint64(b[4])<<24 |\n        uint64(b[3])<<32 | uint64(b[2])<<40 | uint64(b[1])<<48 | uint64(b[0])<<56\n}"
      }
     ]
    },
    {
     "title": "Profiling & benchmarking: testing.B, benchstat, pprof, trace & PGO",
     "def": "<p>Performance work is a loop: <strong>measure → hypothesise → change one thing → measure again with statistics</strong>.</p><ul><li><strong>Benchmarks</strong>: since Go 1.24 write <code>for b.Loop() { ... }</code>. It runs setup once, stops the timer automatically outside the loop and keeps call arguments/results alive so the compiler cannot delete the measured code (the old <code>for i := 0; i &lt; b.N; i++</code> needed <code>b.ResetTimer</code> and sink variables). Use <code>-benchmem</code>/<code>b.ReportAllocs()</code>, <code>b.RunParallel</code> for contention, and sub-benchmarks for input sizes.</li><li><strong>benchstat</strong> (<code>golang.org/x/perf/cmd/benchstat</code>): run <code>-count=10</code> before and after and compare; it reports deltas with confidence (<code>p</code> values) and flags noise. Never trust a single run.</li><li><strong>pprof</strong> (<code>net/http/pprof</code> or <code>go test -cpuprofile/-memprofile</code>): <em>CPU</em> (sampling at 100 Hz), <em>heap</em> (<code>inuse_space</code> for leaks, <code>alloc_space</code> for GC pressure), <em>allocs</em>, <em>goroutine</em> (leaks; <code>?debug=2</code> full stacks), <em>block</em> and <em>mutex</em> (enable with <code>runtime.SetBlockProfileRate</code>/<code>SetMutexProfileFraction</code>). Use <code>go tool pprof -http=:8080</code> for flame graphs, <code>top -cum</code>, <code>list</code>, and <code>-base</code> to diff profiles.</li><li><strong>Execution tracer</strong> (<code>go tool trace</code>): per-goroutine timeline of scheduling, syscalls, GC, STW and network — answers \"why was this request slow?\" when CPU profiles look clean. Go 1.25 adds <code>trace.FlightRecorder</code> to keep the last few seconds in memory and dump them on an anomaly.</li><li><strong>PGO</strong> (GA in Go 1.21): commit a representative production CPU profile as <code>default.pgo</code> in the main package; <code>go build</code> (<code>-pgo=auto</code>) uses it for hotter inlining and devirtualization — typically 2–14% CPU savings. Merge profiles from several replicas with <code>go tool pprof -proto a.pprof b.pprof &gt; default.pgo</code> and refresh the file periodically; a stale profile only loses some benefit and never breaks the build.</li></ul>",
     "interview": "Interviewers want the method, not just tool names: reproduce with a benchmark, profile, form a hypothesis, fix, prove with benchstat. Know the difference between inuse_space and alloc_space, when to reach for trace over pprof (latency, scheduling, GC assists), and why b.Loop fixes dead-code-elimination and setup-timing mistakes.",
     "examples": [
      {
       "label": "Benchmark with b.Loop and sub-benchmarks",
       "lang": "go",
       "code": "func BenchmarkJoin(b *testing.B) {\n    for _, n := range []int{10, 1000} {\n        parts := make([]string, n) // setup: not timed with b.Loop\n        for i := range parts {\n            parts[i] = strconv.Itoa(i)\n        }\n        b.Run(fmt.Sprint(\"n=\", n), func(b *testing.B) {\n            b.ReportAllocs()\n            for b.Loop() {\n                strings.Join(parts, \",\") // result kept alive automatically\n            }\n        })\n    }\n}"
      },
      {
       "label": "Profile, compare and apply PGO",
       "lang": "bash",
       "code": "go test -run=^$ -bench=Join -benchmem -count=10 ./... | tee old.txt\n# ...make the change...\ngo test -run=^$ -bench=Join -benchmem -count=10 ./... | tee new.txt\ngo run golang.org/x/perf/cmd/benchstat@latest old.txt new.txt\n\ngo test -run=^$ -bench=Join -cpuprofile cpu.out -memprofile mem.out\ngo tool pprof -http=:8080 cpu.out\ngo tool pprof -sample_index=alloc_space -top mem.out\n\n# Live service (import _ \"net/http/pprof\" on a private port)\ncurl -o cpu.pprof \"http://localhost:6060/debug/pprof/profile?seconds=30\"\ncp cpu.pprof ./cmd/api/default.pgo && go build -o api ./cmd/api   # PGO is on by default (-pgo=auto)"
      }
     ]
    },
    {
     "title": "Finalizers, cleanups, weak pointers & interning (AddCleanup, weak, unique)",
     "def": "<p>Go 1.23 and 1.24 added GC-aware tools that used to need <code>unsafe</code> tricks. They are for memory-management edge cases, <strong>never a substitute for an explicit <code>Close</code></strong>: the GC decides when, or whether, they run.</p><ul><li><strong>runtime.SetFinalizer</strong> (legacy): one finalizer per object, run on a single goroutine after the object becomes unreachable. The finalizer receives the object, which <em>resurrects</em> it, so the memory is freed only in a later GC cycle. Objects in a reference <strong>cycle</strong> that has a finalizer are never collected, and the pointer must point to the start of an allocation.</li><li><strong>runtime.AddCleanup</strong> (Go 1.24): <code>AddCleanup(ptr, cleanup, arg)</code> calls <code>cleanup(arg)</code> on a separate goroutine some time after <code>ptr</code> becomes unreachable. You can attach several cleanups per object, including to interior pointers. Cycles are collected and the object is not resurrected, so its memory is reclaimed in the same cycle. The rule: neither the cleanup function nor <code>arg</code> may reference <code>ptr</code>, or it is never collected. <code>GODEBUG=checkfinalizers=1</code> (Go 1.25) helps catch this. Cancel with the returned <code>Cleanup.Stop()</code>. Neither cleanups nor finalizers are guaranteed to run before the program exits.</li><li><strong>weak.Pointer[T]</strong> (Go 1.24): <code>weak.Make(p)</code> creates a reference the GC ignores; <code>wp.Value()</code> returns the pointer, or <code>nil</code> once the object has been reclaimed. Two weak pointers compare equal exactly when they were made from the same pointer, even after collection, so they work as map keys and values. Use cases: caches that must not pin memory, canonicalisation maps, and side tables keyed by objects you do not own.</li><li><strong>unique.Make[T]</strong> (Go 1.23): interns a comparable value and returns a <code>unique.Handle[T]</code>. Equal values give the same handle, so comparing handles is a single pointer comparison and duplicates share one copy (<code>net/netip</code> uses it for IPv6 zones). An interned value is freed once no handle references it.</li><li><strong>runtime.KeepAlive(x)</strong>: keeps <code>x</code> reachable up to that point in the code. You need it when a cleanup would close a resource (for example a raw file descriptor) that you are still using after your last reference to the wrapper.</li></ul>",
     "interview": "Expect: why finalizers are no substitute for Close (they are non-deterministic, may never run and delay freeing), what AddCleanup fixes compared with SetFinalizer (cycles, resurrection, one per object), what weak pointers are for (caches and canonicalisation maps that do not pin memory), and the classic bug of a cleanup closure that captures the very object it watches, so it is never collected. Mention unique.Make for interning highly repeated values such as label strings or hostnames.",
     "examples": [
      {
       "label": "Weak-value cache: entries vanish when nobody else uses the value",
       "lang": "go",
       "code": "package weakcache\n\nimport (\n    \"runtime\"\n    \"sync\"\n    \"weak\"\n)\n\n// Cache maps keys to values without keeping the values alive: once no one else\n// references a value, the GC may reclaim it and a cleanup removes the stale entry.\ntype Cache[K comparable, V any] struct {\n    mu sync.Mutex\n    m  map[K]weak.Pointer[V]\n}\n\nfunc New[K comparable, V any]() *Cache[K, V] {\n    return &Cache[K, V]{m: make(map[K]weak.Pointer[V])}\n}\n\nfunc (c *Cache[K, V]) Get(k K, load func() *V) *V {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    if wp, ok := c.m[k]; ok {\n        if v := wp.Value(); v != nil { // nil once the value was collected\n            return v\n        }\n    }\n    v := load()\n    wp := weak.Make(v)\n    c.m[k] = wp\n    // The cleanup must not reference v (that would keep it alive forever);\n    // it captures only the key and the weak pointer.\n    runtime.AddCleanup(v, func(k K) {\n        c.mu.Lock()\n        defer c.mu.Unlock()\n        if cur, ok := c.m[k]; ok && cur == wp { // don't delete a newer entry\n            delete(c.m, k)\n        }\n    }, k)\n    return v\n}"
      },
      {
       "label": "Interning with unique.Make (Go 1.23+)",
       "lang": "go",
       "code": "package interning\n\nimport (\n    \"fmt\"\n    \"strings\"\n    \"unique\"\n)\n\nfunc Demo(region string) {\n    a := unique.Make(\"us-east-1\")\n    b := unique.Make(strings.Clone(region)) // different backing memory\n    fmt.Println(a == b, a.Value())          // true if region == \"us-east-1\": one pointer compare\n}"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Find and explain what escapes to the heap",
     "d": "easy",
     "type": "hands-on",
     "hint": "<ul><li>Run <code>go build -gcflags=-m</code> (or <code>-m=2</code> for the reasoning chain) on a package.</li><li>Classify each line: <code>escapes to heap</code>, <code>moved to heap</code>, <code>leaking param</code>, <code>does not escape</code>.</li><li>Fix the avoidable ones: return values not pointers, accept caller buffers, avoid interface boxing in hot paths.</li><li>Confirm with <code>go test -bench . -benchmem</code> that <code>allocs/op</code> dropped.</li></ul>",
     "solution": "package escape\n\nimport (\n    \"strconv\"\n    \"testing\"\n)\n\ntype Point struct{ X, Y int }\n\n// BEFORE: &Point{...} escapes to heap (1 alloc/op)\nfunc NewPointPtr(x, y int) *Point { return &Point{x, y} }\n\n// AFTER: returned by value, stays on the caller stack (0 allocs/op)\nfunc NewPoint(x, y int) Point { return Point{x, y} }\n\n// BEFORE: Itoa allocates a new string per call\nfunc LabelSlow(id int) string { return \"id-\" + strconv.Itoa(id) }\n\n// AFTER: append into a caller-owned buffer; dst does not escape\nfunc AppendLabel(dst []byte, id int) []byte {\n    dst = append(dst, \"id-\"...)\n    return strconv.AppendInt(dst, int64(id), 10)\n}\n\nvar sink *Point\n\nfunc BenchmarkPtr(b *testing.B) {\n    for b.Loop() {\n        sink = NewPointPtr(1, 2)\n    }\n}\n\nfunc BenchmarkValue(b *testing.B) {\n    for b.Loop() {\n        p := NewPoint(1, 2)\n        _ = p\n    }\n}\n\nfunc BenchmarkAppendLabel(b *testing.B) {\n    buf := make([]byte, 0, 32)\n    for b.Loop() {\n        buf = AppendLabel(buf[:0], 42)\n    }\n}\n\n// $ go test -bench . -benchmem\n// BenchmarkPtr-8          ...   16 B/op   1 allocs/op\n// BenchmarkValue-8        ...    0 B/op   0 allocs/op\n// BenchmarkAppendLabel-8  ...    0 B/op   0 allocs/op",
     "lang": "go"
    },
    {
     "t": "Write a trustworthy benchmark and compare with benchstat",
     "d": "easy",
     "type": "coding",
     "hint": "<ul><li>Use <code>for b.Loop()</code> (Go 1.24+): setup outside the loop is excluded and results are kept alive.</li><li>Benchmark realistic input sizes with <code>b.Run</code> sub-benchmarks.</li><li>Report allocations; run <code>-count=10</code> for both versions and compare with <code>benchstat</code>.</li><li>Keep the machine quiet (no other load, fixed CPU frequency if possible).</li></ul>",
     "solution": "package concat\n\nimport (\n    \"fmt\"\n    \"strings\"\n    \"testing\"\n)\n\nfunc ConcatPlus(parts []string) string {\n    s := \"\"\n    for _, p := range parts {\n        s += p // O(n^2) copying, one allocation per iteration\n    }\n    return s\n}\n\nfunc ConcatBuilder(parts []string) string {\n    n := 0\n    for _, p := range parts {\n        n += len(p)\n    }\n    var sb strings.Builder\n    sb.Grow(n) // single allocation\n    for _, p := range parts {\n        sb.WriteString(p)\n    }\n    return sb.String()\n}\n\nfunc BenchmarkConcat(b *testing.B) {\n    impls := map[string]func([]string) string{\"plus\": ConcatPlus, \"builder\": ConcatBuilder}\n    for _, size := range []int{8, 512} {\n        parts := make([]string, size)\n        for i := range parts {\n            parts[i] = \"chunk\"\n        }\n        for name, fn := range impls {\n            b.Run(fmt.Sprintf(\"%s/n=%d\", name, size), func(b *testing.B) {\n                b.ReportAllocs()\n                for b.Loop() {\n                    fn(parts)\n                }\n            })\n        }\n    }\n}\n\n// go test -run=^$ -bench=Concat -count=10 > results.txt\n// go run golang.org/x/perf/cmd/benchstat@latest -col /impl results.txt   (or old.txt new.txt)",
     "lang": "go"
    },
    {
     "t": "Shrink a hot struct by reordering fields",
     "d": "easy",
     "type": "coding",
     "hint": "<ul><li>Each field is aligned to its own size; padding is inserted before misaligned fields and at the end to round up to the largest alignment.</li><li>Sort fields by alignment, largest first; group bools/bytes together at the end.</li><li>Put pointer fields first so the GC scans a shorter prefix.</li><li>Verify with <code>unsafe.Sizeof</code> and the <code>fieldalignment</code> analyzer; matters most for structs stored by the million.</li></ul>",
     "solution": "package main\n\nimport (\n    \"fmt\"\n    \"unsafe\"\n)\n\ntype SessionBad struct {\n    Active   bool    // offset 0, then 7 bytes padding\n    UserID   int64   // offset 8\n    IsAdmin  bool    // offset 16, then 3 bytes padding\n    Hits     int32   // offset 20\n    Verified bool    // offset 24, then 7 bytes padding\n    Token    *string // offset 32\n} // 40 bytes\n\ntype SessionGood struct {\n    Token    *string // pointers first: GC scans only the first word\n    UserID   int64\n    Hits     int32\n    Active   bool\n    IsAdmin  bool\n    Verified bool    // 1 byte of tail padding\n} // 24 bytes: 40% less memory and more objects per cache line\n\nfunc main() {\n    fmt.Println(unsafe.Sizeof(SessionBad{}), unsafe.Sizeof(SessionGood{})) // 40 24\n    fmt.Println(unsafe.Offsetof(SessionBad{}.UserID), unsafe.Alignof(SessionBad{}.UserID))\n}\n\n// Automated check:\n// go run golang.org/x/tools/go/analysis/passes/fieldalignment/cmd/fieldalignment@latest ./...",
     "lang": "go"
    },
    {
     "t": "Eliminate false sharing in per-worker counters",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>Adjacent <code>atomic.Int64</code> values share a 64-byte line, so every increment invalidates the other cores&#39; copies.</li><li>Pad each counter to its own cache line and benchmark both versions with several workers.</li><li>Best fix: accumulate in a goroutine-local variable and publish once.</li><li>Expect padded/local to be several times faster on multi-core machines; on 1 core there is no difference.</li></ul>",
     "solution": "package counters\n\nimport (\n    \"sync\"\n    \"sync/atomic\"\n    \"testing\"\n)\n\nconst workers = 8\nconst incs = 100_000\n\ntype plain struct{ n atomic.Int64 } // 8 bytes: 8 counters on one cache line\n\ntype padded struct {\n    n atomic.Int64\n    _ [56]byte // 64 bytes total: one counter per cache line\n}\n\nfunc hammer(b *testing.B, inc func(w int)) {\n    for b.Loop() {\n        var wg sync.WaitGroup\n        for w := range workers {\n            wg.Go(func() { // Go 1.25+\n                for range incs {\n                    inc(w)\n                }\n            })\n        }\n        wg.Wait()\n    }\n}\n\nfunc BenchmarkFalseSharing(b *testing.B) {\n    var c [workers]plain\n    hammer(b, func(w int) { c[w].n.Add(1) })\n}\n\nfunc BenchmarkPadded(b *testing.B) {\n    var c [workers]padded\n    hammer(b, func(w int) { c[w].n.Add(1) })\n}\n\n// Best: no shared writes in the hot loop at all.\nfunc BenchmarkLocalThenPublish(b *testing.B) {\n    var total atomic.Int64\n    for b.Loop() {\n        var wg sync.WaitGroup\n        for range workers {\n            wg.Go(func() {\n                local := int64(0)\n                for range incs {\n                    local++\n                }\n                total.Add(local)\n            })\n        }\n        wg.Wait()\n    }\n}",
     "lang": "go"
    },
    {
     "t": "Cut allocations in a hot logging path with sync.Pool",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>Measure first: <code>fmt.Sprintf</code> boxes every argument and allocates the result string.</li><li>Write directly into a pooled <code>*bytes.Buffer</code> using <code>strconv.AppendInt</code> with <code>buf.AvailableBuffer()</code>.</li><li><code>Reset</code> before reuse and skip <code>Put</code> for oversized buffers.</li><li>Prove the win with <code>-benchmem</code>: allocs/op should drop to 0 in steady state.</li></ul>",
     "solution": "package hotpath\n\nimport (\n    \"bytes\"\n    \"fmt\"\n    \"io\"\n    \"strconv\"\n    \"sync\"\n    \"testing\"\n    \"time\"\n)\n\n// Slow: boxes args into interfaces and allocates the result string (~2 allocs/op).\nfunc WriteSlow(w io.Writer, user string, id int, lat time.Duration) error {\n    _, err := io.WriteString(w, fmt.Sprintf(\"user=%s id=%d latency_ms=%d\\n\", user, id, lat.Milliseconds()))\n    return err\n}\n\nvar bufPool = sync.Pool{New: func() any { return new(bytes.Buffer) }}\n\n// Fast: zero allocations in steady state.\nfunc WriteFast(w io.Writer, user string, id int, lat time.Duration) error {\n    buf := bufPool.Get().(*bytes.Buffer)\n    buf.Reset()\n    defer func() {\n        if buf.Cap() <= 64<<10 {\n            bufPool.Put(buf)\n        }\n    }()\n    buf.WriteString(\"user=\")\n    buf.WriteString(user)\n    buf.WriteString(\" id=\")\n    buf.Write(strconv.AppendInt(buf.AvailableBuffer(), int64(id), 10))\n    buf.WriteString(\" latency_ms=\")\n    buf.Write(strconv.AppendInt(buf.AvailableBuffer(), lat.Milliseconds(), 10))\n    buf.WriteString(\"\\n\")\n    _, err := w.Write(buf.Bytes())\n    return err\n}\n\nfunc BenchmarkWriteSlow(b *testing.B) {\n    b.ReportAllocs()\n    for b.Loop() {\n        _ = WriteSlow(io.Discard, \"alice\", 42, 37*time.Millisecond)\n    }\n}\n\nfunc BenchmarkWriteFast(b *testing.B) {\n    b.ReportAllocs()\n    for b.Loop() {\n        _ = WriteFast(io.Discard, \"alice\", 42, 37*time.Millisecond)\n    }\n}",
     "lang": "go"
    },
    {
     "t": "Diagnose a goroutine leak in production",
     "d": "medium",
     "type": "debug",
     "hint": "<ul><li>Symptom: memory and <code>runtime.NumGoroutine()</code> grow forever; latency degrades slowly.</li><li>Grab <code>/debug/pprof/goroutine?debug=1</code> twice a few minutes apart: stacks whose counts keep growing are the leak (or <code>go tool pprof -base old new</code>).</li><li>Typical root causes: send on an unbuffered channel nobody reads after a timeout, missing <code>ctx.Done()</code> case, a goroutine looping on <code>ticker.C</code> with no exit case, or an unclosed <code>resp.Body</code> (it pins the connection and its transport goroutines). An unstopped <code>time.Ticker</code> on its own owns no goroutine and, since Go 1.23, is garbage-collected once unreferenced, but still call <code>Stop</code>.</li><li>Go 1.26 added a <code>goroutineleak</code> profile as an experiment (<code>GOEXPERIMENT=goroutineleakprofile</code>); it is standard in Go 1.27 at <code>/debug/pprof/goroutineleak</code>. The GC reports goroutines blocked on channels or locks that no other goroutine can ever reach, so the leak is proven rather than inferred from growing counts.</li><li>Fix the ownership: whoever starts a goroutine must guarantee it can exit; guard with tests (<code>testing/synctest</code> in Go 1.25 fails on goroutines left blocked in the bubble, or <code>go.uber.org/goleak</code>).</li></ul>",
     "solution": "package leak\n\nimport \"context\"\n\n// LEAKY: if ctx expires first, the goroutine blocks forever on ch <- v\n// (shows up in the goroutine profile as \"chan send\" stacks that only grow).\nfunc FetchLeaky(ctx context.Context, fetch func() string) (string, error) {\n    ch := make(chan string)\n    go func() { ch <- fetch() }()\n    select {\n    case v := <-ch:\n        return v, nil\n    case <-ctx.Done():\n        return \"\", ctx.Err()\n    }\n}\n\ntype result struct {\n    v   string\n    err error\n}\n\n// FIXED: buffer of 1 means the send always completes, and fetch observes ctx\n// so the work itself is cancelled instead of running to completion.\nfunc Fetch(ctx context.Context, fetch func(context.Context) (string, error)) (string, error) {\n    ch := make(chan result, 1)\n    go func() {\n        v, err := fetch(ctx)\n        ch <- result{v, err}\n    }()\n    select {\n    case r := <-ch:\n        return r.v, r.err\n    case <-ctx.Done():\n        return \"\", ctx.Err()\n    }\n}\n\n// Investigation:\n//   curl -s localhost:6060/debug/pprof/goroutine?debug=1 | head -40\n//   go tool pprof -top -base goroutine-10m.pb.gz goroutine-20m.pb.gz",
     "lang": "go"
    },
    {
     "t": "Stop a Go service from being OOMKilled in Kubernetes",
     "d": "medium",
     "type": "debug",
     "hint": "<ul><li>With <code>GOGC=100</code> the heap may reach ~2× live heap before a cycle — a 600 MB live heap can exceed a 1 GiB limit.</li><li>Confirm with <code>GODEBUG=gctrace=1</code> (live heap and goal) and a heap profile (<code>inuse_space</code>) to rule out a real leak.</li><li>Set <code>GOMEMLIMIT</code> to ~90% of the container memory limit so the GC works harder before the kernel kills you.</li><li>If live heap itself is close to the limit, the fix is less memory (or a bigger limit), not GC tuning — otherwise you get GC thrashing.</li><li>Remember non-heap memory: goroutine stacks, cgo, mmap and page cache are partly or wholly outside GOMEMLIMIT.</li></ul>",
     "solution": "# Deployment excerpt\ncontainers:\n- name: api\n  image: ghcr.io/acme/api:1.8.2\n  resources:\n    requests: { cpu: \"1\", memory: 1Gi }\n    limits:   { memory: 1Gi }\n  env:\n  - name: GOMEMLIMIT          # soft limit for all Go-runtime-managed memory\n    value: \"900MiB\"           # ~90% of the limit, leaving headroom for non-Go memory\n  - name: GOGC                # keep default; raise only if CPU is spent in GC and memory is free\n    value: \"100\"\n  - name: GODEBUG\n    value: \"gctrace=1\"        # temporarily, to verify heap goal vs limit\n# Check: kubectl logs api-xyz | grep \"MB goal\"  and  container_memory_working_set_bytes",
     "lang": "yaml"
    },
    {
     "t": "CPU-profile a slow service and apply PGO",
     "d": "hard",
     "type": "hands-on",
     "hint": "<ul><li>Expose <code>net/http/pprof</code> on an internal-only port; capture a 30 s CPU profile under realistic load.</li><li>Read it with <code>top -cum</code>, the flame graph and <code>list Func</code>; look for JSON/regexp/fmt, lock contention and allocation-heavy paths (correlate with <code>alloc_space</code>).</li><li>Fix the biggest hotspot, re-measure with a benchmark + benchstat.</li><li>Then commit the production profile as <code>default.pgo</code> next to <code>main</code> and rebuild; compare <code>-pgo=off</code> vs default under the same load. Refresh the profile periodically.</li></ul>",
     "solution": "# 1. In main: import _ \"net/http/pprof\"; go http.ListenAndServe(\"localhost:6060\", nil)\n# 2. Capture under load (e.g. hey/vegeta/k6 running in parallel)\ncurl -o cpu.pprof \"http://localhost:6060/debug/pprof/profile?seconds=30\"\ncurl -o allocs.pprof \"http://localhost:6060/debug/pprof/allocs\"\n\n# 3. Analyse\ngo tool pprof -top -cum cpu.pprof | head -25\ngo tool pprof -list \"handler.parseOrder\" cpu.pprof\ngo tool pprof -sample_index=alloc_space -top allocs.pprof\ngo tool pprof -http=:8080 cpu.pprof          # flame graph view\n\n# 4. Fix, then prove it\ngo test -run=^$ -bench=ParseOrder -count=10 ./internal/handler > new.txt\ngo run golang.org/x/perf/cmd/benchstat@latest old.txt new.txt\n\n# 5. PGO: production profile drives inlining + devirtualization\ncp cpu.pprof cmd/api/default.pgo\ngo build -pgo=off -o api-nopgo ./cmd/api\ngo build -o api-pgo ./cmd/api                 # -pgo=auto picks up default.pgo\ngo version -m api-pgo | grep pgo              # confirms the build setting",
     "lang": "bash"
    },
    {
     "t": "Explain p99 latency spikes with the execution tracer",
     "d": "hard",
     "type": "debug",
     "hint": "<ul><li>CPU profiles average over time; spikes need a <strong>timeline</strong>: <code>go tool trace</code>.</li><li>Look for: long <strong>GC mark assists</strong> on request goroutines, STW pauses, goroutines runnable but not running (scheduler latency / GOMAXPROCS too low or CPU throttling), syscalls, and blocking on mutexes/channels.</li><li>Use <code>trace.FlightRecorder</code> (Go 1.25) to keep a rolling window and dump it only when a request exceeds the SLO.</li><li>Typical fixes: cut allocation rate, raise GOGC / set GOMEMLIMIT, shard hot locks, fix CPU limits.</li></ul>",
     "solution": "package main\n\nimport (\n    \"log\"\n    \"net/http\"\n    \"os\"\n    \"runtime/trace\"\n    \"sync\"\n    \"time\"\n)\n\nvar (\n    fr       = trace.NewFlightRecorder(trace.FlightRecorderConfig{MinAge: 5 * time.Second, MaxBytes: 16 << 20})\n    dumpOnce sync.Once\n)\n\n// slowTrace dumps the last ~5s of execution trace the first time a request breaches the SLO.\nfunc slowTrace(next http.Handler, slo time.Duration) http.Handler {\n    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n        start := time.Now()\n        next.ServeHTTP(w, r)\n        if time.Since(start) > slo {\n            dumpOnce.Do(func() {\n                f, err := os.Create(\"spike.trace\")\n                if err != nil {\n                    log.Print(err)\n                    return\n                }\n                defer f.Close()\n                if _, err := fr.WriteTo(f); err != nil {\n                    log.Print(err)\n                }\n                log.Print(\"wrote spike.trace; inspect with: go tool trace spike.trace\")\n            })\n        }\n    })\n}\n\nfunc main() {\n    if err := fr.Start(); err != nil {\n        log.Fatal(err)\n    }\n    defer fr.Stop()\n    mux := http.NewServeMux()\n    mux.HandleFunc(\"GET /work\", func(w http.ResponseWriter, r *http.Request) {\n        w.Write([]byte(\"ok\"))\n    })\n    log.Fatal(http.ListenAndServe(\":8080\", slowTrace(mux, 300*time.Millisecond)))\n}",
     "lang": "go"
    },
    {
     "t": "Remove lock contention with a sharded concurrent map",
     "d": "hard",
     "type": "coding",
     "hint": "<ul><li>A single <code>sync.RWMutex</code> around a map serialises all writers; the mutex profile shows it.</li><li>Split into N shards (power of two), each with its own lock + map; pick the shard from a seeded hash of the key (<code>maphash.Comparable</code>, Go 1.24).</li><li>Pad shards so neighbouring mutexes do not share cache lines.</li><li>Benchmark with <code>b.RunParallel</code>; compare with <code>sync.Map</code> (great for read-mostly or disjoint-key workloads).</li></ul>",
     "solution": "package shardmap\n\nimport (\n    \"hash/maphash\"\n    \"sync\"\n)\n\ntype shard[K comparable, V any] struct {\n    mu sync.RWMutex\n    m  map[K]V\n    _  [64]byte // keep hot mutexes on different cache lines\n}\n\ntype Map[K comparable, V any] struct {\n    seed   maphash.Seed\n    shards []shard[K, V]\n    mask   uint64\n}\n\n// New creates a map with n shards; n is rounded up to a power of two.\nfunc New[K comparable, V any](n int) *Map[K, V] {\n    size := 1\n    for size < n {\n        size <<= 1\n    }\n    m := &Map[K, V]{seed: maphash.MakeSeed(), shards: make([]shard[K, V], size), mask: uint64(size - 1)}\n    for i := range m.shards {\n        m.shards[i].m = make(map[K]V)\n    }\n    return m\n}\n\nfunc (m *Map[K, V]) shardFor(k K) *shard[K, V] {\n    return &m.shards[maphash.Comparable(m.seed, k)&m.mask]\n}\n\nfunc (m *Map[K, V]) Get(k K) (V, bool) {\n    s := m.shardFor(k)\n    s.mu.RLock()\n    defer s.mu.RUnlock()\n    v, ok := s.m[k]\n    return v, ok\n}\n\nfunc (m *Map[K, V]) Set(k K, v V) {\n    s := m.shardFor(k)\n    s.mu.Lock()\n    s.m[k] = v\n    s.mu.Unlock()\n}\n\n// Update applies fn atomically to the value stored under k.\nfunc (m *Map[K, V]) Update(k K, fn func(old V, ok bool) V) {\n    s := m.shardFor(k)\n    s.mu.Lock()\n    defer s.mu.Unlock()\n    old, ok := s.m[k]\n    s.m[k] = fn(old, ok)\n}\n\nfunc (m *Map[K, V]) Delete(k K) {\n    s := m.shardFor(k)\n    s.mu.Lock()\n    delete(s.m, k)\n    s.mu.Unlock()\n}\n\nfunc (m *Map[K, V]) Len() int {\n    n := 0\n    for i := range m.shards {\n        s := &m.shards[i]\n        s.mu.RLock()\n        n += len(s.m)\n        s.mu.RUnlock()\n    }\n    return n\n}",
     "lang": "go"
    }
   ],
   "interviewFocus": [
    {
     "q": "Walk me through what the runtime does when a goroutine makes a blocking file read versus reading from a TCP socket.",
     "a": "<p><strong>Socket read</strong>: sockets are non-blocking. <code>conn.Read</code> tries the syscall; on <code>EAGAIN</code> the goroutine registers with the <strong>netpoller</strong> (epoll/kqueue/IOCP) and is <em>parked</em>. Its M and P immediately run other goroutines. When data arrives, the poller (checked by schedulers in <code>findRunnable</code> and by <code>sysmon</code>) marks the G runnable and it is queued on a P. Cost: just the goroutine stack.</p><p><strong>Regular file read</strong>: most OSes have no usable readiness API for disk files, so it is a genuinely <strong>blocking syscall</strong>. The G and its M enter the kernel; the P is left in <code>_Psyscall</code>. If the call takes longer than a sysmon tick (≥20 µs), <code>sysmon</code> <strong>retakes the P</strong> and hands it to another (possibly new) M so other goroutines continue. When the syscall returns, the M tries to grab a P; otherwise the G goes to the global run queue and the M parks.</p><ul><li>Consequence: thousands of concurrent blocking syscalls create thousands of threads (limit via <code>debug.SetMaxThreads</code>, default 10,000) — bound concurrency with a semaphore.</li><li>cgo calls behave like blocking syscalls.</li></ul>"
    },
    {
     "q": "How does the Go GC work, and how would you tune a latency-sensitive service running in a 2 GiB container?",
     "a": "<p>Concurrent tri-color mark-sweep: two short STW phases bracket a concurrent mark that uses ~25% of GOMAXPROCS, with a hybrid write barrier keeping the invariant while the program mutates pointers. The <strong>pacer</strong> starts a cycle so that marking finishes as the heap reaches the goal (≈ live × (1 + GOGC/100)); goroutines that out-allocate the marker pay via <strong>mark assists</strong>, which show up as latency.</p><p>Tuning approach:</p><ol><li><strong>Measure</strong>: <code>gctrace=1</code>, <code>/sched/gc</code> metrics, alloc profiles, and execution traces for assists.</li><li><strong>Allocate less</strong>: preallocation, pools for hot buffers, value types, fewer pointers (less scan work).</li><li><strong>GOMEMLIMIT≈1800MiB</strong>: protects against OOMKill and lets you raise <strong>GOGC</strong> (e.g. 200–400) to run fewer cycles while memory is plentiful; the limit tightens collection only when needed.</li><li>Ensure <code>GOMAXPROCS</code> matches the CPU limit (automatic since Go 1.25) — throttling inflates every GC phase.</li></ol><p>Avoid <code>GOGC=off</code> unless the live heap is far below the limit; near the limit the GC thrashes (capped at ~50% CPU).</p>"
    },
    {
     "q": "Explain escape analysis. How do you systematically reduce allocations in a hot path?",
     "a": "<p>The compiler proves, per value, whether it can outlive its stack frame. If not provable, it allocates on the heap. Stack allocations are free to create and free; heap allocations cost malloc time plus GC mark/sweep work proportional to pointers.</p><ul><li><strong>Find</strong>: <code>-benchmem</code>/<code>b.ReportAllocs</code>, <code>pprof -sample_index=alloc_space</code>, then <code>-gcflags=-m=2</code> on the hot function to see <em>why</em> each allocation escapes.</li><li><strong>Fix patterns</strong>: return values instead of pointers for small structs; let callers pass buffers (<code>AppendX(dst []byte)</code>); preallocate slices/maps with capacity; avoid boxing into <code>any</code> (fmt, logging with variadic <code>any</code>); avoid closures capturing large state in hot loops; reuse with <code>sync.Pool</code>; avoid <code>string(b)</code> copies (map lookups with <code>m[string(b)]</code> are optimised).</li><li><strong>Verify</strong> with benchstat — and keep the code readable; only optimise what profiles show is hot.</li></ul>"
    },
    {
     "q": "What is false sharing, how do you detect it, and how do you fix it in Go?",
     "a": "<p>Caches track ownership per <strong>64-byte line</strong>. If core A writes <code>x</code> and core B writes <code>y</code> and both sit on the same line, each write invalidates the other core&#39;s copy (MESI coherence traffic), so independent counters behave like a contended lock — throughput can drop by an order of magnitude as cores increase.</p><ul><li><strong>Detect</strong>: scaling that gets worse with more goroutines despite no locks; benchmark with and without padding; on Linux <code>perf c2c</code> shows contended lines.</li><li><strong>Fix</strong>: pad hot per-core/per-shard structs to a cache line (<code>_ [56]byte</code> after an 8-byte field, or <code>cpu.CacheLinePad</code>); allocate per-worker state separately; best of all, accumulate locally and merge once.</li><li>Do not pad everything: it wastes memory and cache capacity. Apply only to data written concurrently by different cores.</li></ul>"
    },
    {
     "q": "A service got 30% slower after a release. Describe your end-to-end investigation.",
     "a": "<ol><li><strong>Quantify and localise</strong>: compare dashboards (latency percentiles, CPU, GC CPU %, allocation rate, goroutines) between versions; canary if possible.</li><li><strong>Profile both builds</strong> under the same load: CPU profile diff with <code>go tool pprof -base old.pprof new.pprof</code>; alloc profile diff for GC pressure; mutex/block profiles if CPU is not saturated but latency rose.</li><li><strong>Timeline</strong>: if profiles look similar but tails got worse, take an execution trace (or flight recorder dump) — look for GC assists, scheduler latency, syscalls.</li><li><strong>Reproduce</strong> in a micro-benchmark of the suspect path; bisect commits if needed (<code>git bisect run</code> with a benchmark threshold).</li><li><strong>Fix and prove</strong>: <code>benchstat</code> with <code>-count=10</code>, then verify in production metrics. Add a benchmark to CI to prevent regressions; consider PGO with a fresh profile.</li></ol>"
    },
    {
     "q": "What changed in the Go runtime and tooling between Go 1.24 and 1.26 that a performance-minded engineer should know?",
     "a": "<ul><li><strong>Go 1.24</strong>: maps reimplemented as <strong>Swiss tables</strong> (faster lookups and inserts, less memory for large maps); <code>testing.B.Loop</code>; <code>runtime.AddCleanup</code> and the <code>weak</code> package; <code>hash/maphash.Comparable</code>; <code>os.Root</code>; <code>tool</code> directives in <code>go.mod</code>.</li><li><strong>Go 1.25</strong>: container-aware default GOMAXPROCS (cgroup CPU limit, updated at runtime; <code>runtime.SetDefaultGOMAXPROCS</code>); <code>runtime/trace.FlightRecorder</code>; the Green Tea GC as <code>GOEXPERIMENT=greenteagc</code>; <code>testing/synctest</code> stable; <code>sync.WaitGroup.Go</code>; more slices allocated on the stack; <code>GODEBUG=checkfinalizers=1</code>; <code>encoding/json/v2</code> behind <code>GOEXPERIMENT=jsonv2</code>.</li><li><strong>Go 1.26</strong>: <strong>Green Tea on by default</strong> (opt out with <code>GOEXPERIMENT=nogreenteagc</code>), and an experimental <code>goroutineleak</code> profile.</li></ul><p>In an interview, tie each change to a symptom: GC CPU in profiles (Green Tea, GOMEMLIMIT), CPU throttling in containers (GOMAXPROCS), rare tail-latency spikes (flight recorder), flaky time-based tests (synctest). Upgrading the toolchain is often the cheapest performance win, but verify it with benchstat and a canary: raising the <code>go</code> line in <code>go.mod</code> also changes GODEBUG defaults.</p>"
    }
   ],
   "quiz": [
    {
     "q": "What do G, M and P stand for in the Go scheduler?",
     "a": "G = goroutine, M = machine (OS thread), P = processor (scheduling context with a local run queue); GOMAXPROCS sets the number of Ps."
    },
    {
     "q": "Since which Go version can tight loops without function calls be preempted, and how?",
     "a": "Go 1.14: sysmon detects a goroutine running more than 10 ms and sends its thread a signal (SIGURG on Unix) to trigger asynchronous preemption."
    },
    {
     "q": "What changed about GOMAXPROCS defaults in Go 1.25?",
     "a": "On Linux the runtime considers the cgroup CPU limit when choosing the default GOMAXPROCS and periodically updates it if the limit changes."
    },
    {
     "q": "What is the maximum size of a \"small\" object in the Go allocator?",
     "a": "32 KiB; larger objects are allocated directly from the heap (mheap) as large spans."
    },
    {
     "q": "Which compiler flag prints escape analysis decisions?",
     "a": "go build -gcflags=-m (use -m=2 for more detail about why a value escapes)."
    },
    {
     "q": "What does GOMEMLIMIT do?",
     "a": "Sets a soft limit on total Go runtime memory; the GC collects more aggressively as usage approaches it, helping avoid OOM kills."
    },
    {
     "q": "Why use b.Loop instead of a manual b.N loop in Go 1.24+?",
     "a": "It excludes setup/cleanup from timing automatically, runs the benchmark function once, and keeps the loop body from being optimised away."
    },
    {
     "q": "Which pprof sample type shows total bytes allocated (GC pressure) rather than live memory?",
     "a": "alloc_space (and alloc_objects); inuse_space shows memory still live at the time of the profile."
    },
    {
     "q": "Which Go release made the Green Tea garbage collector the default, and what does it change?",
     "a": "Go 1.26 (it was GOEXPERIMENT=greenteagc in Go 1.25). The mark phase scans memory span by span instead of object by object, improving cache locality and typically cutting GC CPU; GOGC and GOMEMLIMIT tuning is unchanged."
    },
    {
     "q": "Name two advantages of runtime.AddCleanup over runtime.SetFinalizer.",
     "a": "Several cleanups per object, including on interior pointers; objects in reference cycles can still be collected; the object is not resurrected, so its memory is freed in the same GC cycle. The cleanup must not reference the object itself."
    },
    {
     "q": "What does weak.Pointer.Value return after the object has been garbage-collected?",
     "a": "nil. weak.Make(p) creates a pointer the GC ignores; once only weak pointers remain, the object can be reclaimed and Value() returns nil."
    },
    {
     "q": "How does trace.FlightRecorder (Go 1.25) help debug rare latency spikes?",
     "a": "It keeps the most recent window of execution trace in memory (bounded by MinAge and MaxBytes). When your code detects an anomaly, it calls WriteTo to snapshot just that window, so you can trace production without recording everything."
    }
   ],
   "resources": [
    {
     "title": "A Guide to the Go Garbage Collector",
     "url": "https://go.dev/doc/gc-guide",
     "type": "docs"
    },
    {
     "title": "Go Diagnostics (profiling, tracing, debugging)",
     "url": "https://go.dev/doc/diagnostics",
     "type": "docs"
    },
    {
     "title": "Profile-guided optimization",
     "url": "https://go.dev/doc/pgo",
     "type": "docs"
    },
    {
     "title": "runtime/pprof package",
     "url": "https://pkg.go.dev/runtime/pprof",
     "type": "docs"
    },
    {
     "title": "Go 1.26 Release Notes (Green Tea GC on by default)",
     "url": "https://go.dev/doc/go1.26",
     "type": "docs"
    }
   ]
  },
  {
   "n": 14,
   "title": "System Design & LLD in Go",
   "group": "Cloud-Native Go (Weeks 9–14)",
   "summary": "Idiomatic Go design (SOLID the Go way, design patterns, concurrency-safe components) and the distributed building blocks behind real backends, practised through the classic low-level-design interview problems with complete Go solutions.",
   "topics": [
    {
     "title": "SOLID & idiomatic Go design",
     "def": "<p>SOLID still applies in Go, but it looks different because Go has <strong>no inheritance</strong> and interfaces are <strong>satisfied implicitly</strong>.</p><ul><li><strong>S</strong>ingle responsibility: packages named for what they provide (<code>billing</code>, <code>ratelimit</code>), never <code>utils</code>/<code>models</code> grab-bags. A type has one reason to change.</li><li><strong>O</strong>pen/closed: add behaviour by adding a new implementation of an interface or by wrapping (middleware), not by growing a <code>switch</code>.</li><li><strong>L</strong>iskov: implementations honour the contract, including edge cases (an <code>io.Reader</code> may return <code>n &gt; 0</code> together with <code>io.EOF</code>).</li><li><strong>I</strong>nterface segregation: Go&#39;s default — 1–3 method interfaces (<code>io.Reader</code>, <code>fmt.Stringer</code>) <strong>declared by the consumer</strong>, next to the code that uses them.</li><li><strong>D</strong>ependency inversion: business logic depends on interfaces it owns; concrete adapters (Postgres, Kafka, S3) are injected from <code>main</code>.</li></ul><p><strong>Accept interfaces, return structs</strong>: callers get the full concrete type, while your function stays decoupled from its inputs. Do not export an interface \"just in case\" for a single implementation — that is interface pollution.</p><p><strong>Dependency injection without frameworks</strong>: constructor injection (<code>NewService(repo Repo, clock func() time.Time, log *slog.Logger)</code>) wired explicitly in <code>main</code>, the <em>composition root</em>. It is compile-time checked and trivial to fake in tests; <code>google/wire</code> only generates the same code when wiring gets large.</p><p><strong>Layout</strong>: <code>cmd/&lt;app&gt;/main.go</code> per binary, <code>internal/</code> for code other modules must not import (compiler-enforced), domain types in leaf packages to avoid import cycles. Start flat; add structure when it hurts.</p>",
     "interview": "Interviewers look for consumer-defined small interfaces, constructor injection wired in main, and the ability to explain why Go prefers composition and implicit interfaces over class hierarchies. Mention the compile-time assertion var _ Iface = (*Impl)(nil) and that internal/ is enforced by the toolchain.",
     "examples": [
      {
       "label": "Consumer-owned interface + constructor injection",
       "lang": "go",
       "code": "// package order — the consumer declares only what it needs.\ntype PaymentCharger interface {\n    Charge(ctx context.Context, customerID string, cents int64) (txID string, err error)\n}\n\ntype Service struct {\n    pay   PaymentCharger\n    now   func() time.Time\n    log   *slog.Logger\n}\n\nfunc NewService(pay PaymentCharger, now func() time.Time, log *slog.Logger) *Service {\n    return &Service{pay: pay, now: now, log: log}\n}\n\n// package stripe — the concrete adapter returns a struct.\ntype Client struct{ apiKey string }\n\nfunc New(apiKey string) *Client { return &Client{apiKey: apiKey} }\n\nfunc (c *Client) Charge(ctx context.Context, customerID string, cents int64) (string, error) {\n    return \"tx_123\", nil\n}\n\nvar _ order.PaymentCharger = (*Client)(nil) // compile-time check\n\n// cmd/api/main.go — the composition root wires everything explicitly.\nsvc := order.NewService(stripe.New(os.Getenv(\"STRIPE_KEY\")), time.Now, slog.Default())"
      },
      {
       "label": "Typical service layout",
       "lang": "bash",
       "code": "acme-orders/\n├── go.mod\n├── cmd/\n│   ├── api/main.go          # HTTP server: config, wiring, graceful shutdown\n│   └── worker/main.go       # background consumer\n├── internal/\n│   ├── order/               # domain logic + consumer-owned interfaces\n│   ├── postgres/            # repository adapters\n│   ├── httpapi/             # handlers, middleware\n│   └── platform/            # logging, metrics, config helpers\n└── api/openapi.yaml"
      }
     ]
    },
    {
     "title": "Creational patterns: functional options, builder, factory, singleton",
     "def": "<ul><li><strong>Functional options</strong>: <code>NewServer(addr string, opts ...Option)</code> where <code>type Option func(*Server)</code> (or returning <code>error</code> for validation). Gives sensible defaults, self-documenting call sites and backwards-compatible growth. A plain <code>Config</code> struct is simpler when there are many fields and zero values are meaningful — both are idiomatic.</li><li><strong>Builder</strong>: fluent, step-by-step construction of a complex value (SQL/query builders, test fixtures). In Go, accumulate the first error inside the builder and return it from <code>Build()</code> so the chain stays fluent.</li><li><strong>Factory</strong>: idiomatic Go constructors are plain <code>NewX</code> functions returning concrete types. Use a factory function returning an interface when the implementation is chosen at runtime (<code>NewStore(cfg) (Store, error)</code>), or a <strong>registry</strong> like <code>database/sql</code> drivers and <code>image</code> formats that register themselves in <code>init</code>.</li><li><strong>Singleton</strong>: lazily initialise with <code>sync.Once</code>, or since Go 1.21 <code>sync.OnceValue</code>/<code>sync.OnceValues</code>, which are race-free and cache the error too. Prefer injecting the instance over reaching for a global — globals hide dependencies and make tests order-dependent.</li><li><strong>Zero-value usability</strong> is a creational pattern of its own: <code>sync.Mutex</code>, <code>bytes.Buffer</code> and <code>strings.Builder</code> need no constructor.</li></ul>",
     "interview": "Be ready to compare functional options vs a config struct vs a builder, and to explain why sync.Once is safe where double-checked locking with a plain bool is a data race. Mention sync.OnceValues and that a panicking Once function is considered done (it will not run again).",
     "examples": [
      {
       "label": "Functional options with validation",
       "lang": "go",
       "code": "type Server struct {\n    addr         string\n    readTimeout  time.Duration\n    maxConns     int\n    logger       *slog.Logger\n}\n\ntype Option func(*Server) error\n\nfunc WithReadTimeout(d time.Duration) Option {\n    return func(s *Server) error {\n        if d <= 0 {\n            return fmt.Errorf(\"read timeout must be > 0, got %v\", d)\n        }\n        s.readTimeout = d\n        return nil\n    }\n}\n\nfunc WithMaxConns(n int) Option {\n    return func(s *Server) error { s.maxConns = n; return nil }\n}\n\nfunc NewServer(addr string, opts ...Option) (*Server, error) {\n    s := &Server{addr: addr, readTimeout: 5 * time.Second, maxConns: 1000, logger: slog.Default()}\n    for _, opt := range opts {\n        if err := opt(s); err != nil {\n            return nil, err\n        }\n    }\n    return s, nil\n}\n\n// srv, err := NewServer(\":8080\", WithReadTimeout(2*time.Second), WithMaxConns(500))"
      },
      {
       "label": "Lazy singleton with sync.OnceValues",
       "lang": "go",
       "code": "var loadConfig = sync.OnceValues(func() (*Config, error) {\n    b, err := os.ReadFile(\"/etc/acme/config.json\")\n    if err != nil {\n        return nil, err\n    }\n    var c Config\n    return &c, json.Unmarshal(b, &c)\n})\n\nfunc handler(w http.ResponseWriter, r *http.Request) {\n    cfg, err := loadConfig() // first caller loads; everyone else gets the cached result\n    if err != nil {\n        http.Error(w, \"config unavailable\", http.StatusServiceUnavailable)\n        return\n    }\n    fmt.Fprintln(w, cfg.Region)\n}"
      }
     ]
    },
    {
     "title": "Behavioral & structural patterns: strategy, observer, decorator, adapter, pipeline",
     "def": "<p>Many GoF patterns collapse into <strong>interfaces + first-class functions</strong> in Go:</p><ul><li><strong>Strategy</strong>: an interface or a function type selected at runtime — <code>slices.SortFunc(items, cmp)</code>, a <code>PricingStrategy</code> for a parking lot, a <code>Backoff</code> policy for retries.</li><li><strong>Observer</strong>: subscribers register callbacks or receive on channels. Decide what happens with slow observers (block, buffer, drop, disconnect) and always provide unsubscribe.</li><li><strong>Decorator / middleware</strong>: wrap a value with the same interface to add behaviour — <code>func(http.Handler) http.Handler</code> for logging, auth, metrics; <code>bufio.NewReader(gzip.NewReader(f))</code> for I/O. Chain of responsibility is the same idea.</li><li><strong>Adapter</strong>: make one interface fit another — <code>http.HandlerFunc</code> adapts a plain function to <code>http.Handler</code>; wrap third-party SDKs behind your own small interface so they can be swapped and faked.</li><li><strong>Pipeline / generator</strong>: stages connected by channels (<code>gen → sq → sink</code>) for concurrent streaming with backpressure; every stage must stop on <code>ctx.Done()</code> to avoid leaks. For sequential lazy sequences, Go 1.23 <strong>range-over-func iterators</strong> (<code>iter.Seq[T]</code>) are simpler and goroutine-free.</li><li><strong>Template method</strong> becomes a function that takes the varying steps as an interface; <strong>embedding</strong> provides composition and method promotion, not inheritance.</li></ul>",
     "interview": "A strong answer names the Go-native form of each pattern (http.HandlerFunc is an adapter, middleware is a decorator, sort comparators are strategies) and its pitfalls: goroutine leaks in pipelines without cancellation, observers that block the publisher, and over-abstracting with interfaces nobody else implements.",
     "examples": [
      {
       "label": "Decorator: composable HTTP middleware",
       "lang": "go",
       "code": "type Middleware func(http.Handler) http.Handler\n\nfunc Chain(h http.Handler, mws ...Middleware) http.Handler {\n    for i := len(mws) - 1; i >= 0; i-- { // first middleware is outermost\n        h = mws[i](h)\n    }\n    return h\n}\n\nfunc Logging(log *slog.Logger) Middleware {\n    return func(next http.Handler) http.Handler {\n        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n            start := time.Now()\n            next.ServeHTTP(w, r)\n            log.Info(\"request\", \"method\", r.Method, \"path\", r.URL.Path, \"dur\", time.Since(start))\n        })\n    }\n}\n\nfunc RequireAPIKey(key string) Middleware {\n    return func(next http.Handler) http.Handler {\n        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n            if subtle.ConstantTimeCompare([]byte(r.Header.Get(\"X-API-Key\")), []byte(key)) != 1 {\n                http.Error(w, \"unauthorized\", http.StatusUnauthorized)\n                return\n            }\n            next.ServeHTTP(w, r)\n        })\n    }\n}\n\n// handler := Chain(mux, Logging(slog.Default()), RequireAPIKey(os.Getenv(\"API_KEY\")))"
      },
      {
       "label": "Generator/pipeline with iter.Seq (Go 1.23+)",
       "lang": "go",
       "code": "func Lines(r io.Reader) iter.Seq[string] {\n    return func(yield func(string) bool) {\n        sc := bufio.NewScanner(r)\n        for sc.Scan() {\n            if !yield(sc.Text()) {\n                return // consumer stopped early: no goroutine to leak\n            }\n        }\n    }\n}\n\nfunc Filter[T any](seq iter.Seq[T], keep func(T) bool) iter.Seq[T] {\n    return func(yield func(T) bool) {\n        for v := range seq {\n            if keep(v) && !yield(v) {\n                return\n            }\n        }\n    }\n}\n\n// for line := range Filter(Lines(f), func(s string) bool { return strings.Contains(s, \"ERROR\") }) {\n//     fmt.Println(line)\n// }"
      }
     ]
    },
    {
     "title": "Concurrency-safe LLD: mutexes, channels & ownership",
     "def": "<p>Every concurrent component starts with one question: <strong>who owns this state?</strong> Pick one model per component:</p><ul><li><strong>Mutex-guarded struct</strong> — shared state with short critical sections: caches, registries, rate limiters. Keep the mutex unexported, declared right above the fields it guards.</li><li><strong>Single-owner goroutine (actor)</strong> — one goroutine owns the state and receives commands over a channel: state machines, schedulers, elevator controllers, connection managers. No locks; sequencing is natural; requests carry a reply channel.</li><li><strong>Copy-on-write snapshot</strong> — read-mostly data (routing tables, feature flags) published via <code>atomic.Pointer[T]</code>; readers never block.</li><li><strong>Atomics</strong> — single counters/flags (<code>atomic.Int64</code>, <code>atomic.Bool</code>).</li></ul><p>Rule of thumb: <em>channels orchestrate, mutexes serialise</em>. Design rules interviewers check:</p><ul><li>Never call out (callbacks, I/O, blocking channel sends) while holding a lock — it invites deadlocks and latency.</li><li><code>RWMutex</code> only pays off for read-heavy, non-trivial critical sections; an LRU <code>Get</code> mutates recency, so it needs a full <code>Mutex</code>.</li><li>Never copy a struct containing a mutex (<code>go vet</code> copylocks); use pointer receivers.</li><li>Lifecycle: <code>Close/Stop</code> must be idempotent (<code>sync.Once</code>), stop background goroutines and wait for them.</li><li>Bounded queues give backpressure; unbounded ones hide overload until OOM.</li><li>Inject time (<code>now func() time.Time</code>) and test with <code>-race</code> and <code>testing/synctest</code> (Go 1.25) for timer-driven logic.</li></ul>",
     "interview": "Expect \"mutex or channel for X, and why?\" Strong answers reason about ownership, invariants and contention, not taste. Mention lock granularity (sharding), never holding locks across I/O, idempotent Close, and how you would prove safety: -race, stress tests, and deterministic time with synctest or an injected clock.",
     "examples": [
      {
       "label": "Copy-on-write config with atomic.Pointer",
       "lang": "go",
       "code": "type Routes struct {\n    byHost map[string]string // never mutated after publish\n}\n\ntype Router struct {\n    cur atomic.Pointer[Routes]\n    mu  sync.Mutex // serialises writers only\n}\n\nfunc (r *Router) Lookup(host string) (string, bool) {\n    rt := r.cur.Load() // lock-free read of an immutable snapshot\n    if rt == nil {\n        return \"\", false\n    }\n    backend, ok := rt.byHost[host]\n    return backend, ok\n}\n\nfunc (r *Router) Set(host, backend string) {\n    r.mu.Lock()\n    defer r.mu.Unlock()\n    next := &Routes{byHost: map[string]string{}}\n    if old := r.cur.Load(); old != nil {\n        maps.Copy(next.byHost, old.byHost)\n    }\n    next.byHost[host] = backend\n    r.cur.Store(next)\n}"
      },
      {
       "label": "Actor: one goroutine owns the state",
       "lang": "go",
       "code": "type op struct {\n    key   string\n    delta int\n    reply chan int\n}\n\ntype Counter struct{ ops chan op }\n\nfunc NewCounter(ctx context.Context) *Counter {\n    c := &Counter{ops: make(chan op)}\n    go func() {\n        counts := map[string]int{} // owned exclusively by this goroutine\n        for {\n            select {\n            case o := <-c.ops:\n                counts[o.key] += o.delta\n                o.reply <- counts[o.key]\n            case <-ctx.Done():\n                return\n            }\n        }\n    }()\n    return c\n}\n\nfunc (c *Counter) Add(ctx context.Context, key string, d int) (int, error) {\n    reply := make(chan int, 1)\n    select {\n    case c.ops <- op{key, d, reply}:\n        return <-reply, nil\n    case <-ctx.Done():\n        return 0, ctx.Err()\n    }\n}"
      }
     ]
    },
    {
     "title": "Distributed building blocks in Go",
     "def": "<ul><li><strong>Consistent hashing</strong>: place nodes on a hash ring; a key belongs to the first node clockwise. Adding/removing a node moves only ~K/N keys (modulo hashing moves almost all). <strong>Virtual nodes</strong> (100–200 per node) smooth the distribution and allow weighting. Alternatives: rendezvous (HRW) hashing, jump hash (fast, but only append/remove-last).</li><li><strong>Sharded cache</strong>: in-process — hash to N shards each with its own lock + LRU; distributed — client-side consistent hashing to cache nodes plus <code>singleflight</code> (<code>golang.org/x/sync/singleflight</code>) to collapse concurrent misses for the same key (thundering herd).</li><li><strong>Idempotency keys</strong>: the client sends <code>Idempotency-Key</code>; the server stores key → (request hash, status, response) under a unique constraint, in the same transaction as the side effect. Retries replay the stored response; a concurrent duplicate gets <code>409</code>/\"in progress\"; keys expire after a TTL.</li><li><strong>Transactional outbox</strong>: solves the dual-write problem (DB commit + Kafka publish cannot be atomic). Write the business row and an <code>outbox</code> row in one DB transaction; a relay (poller with <code>FOR UPDATE SKIP LOCKED</code>, or CDC such as Debezium) publishes and marks rows sent. Delivery is at-least-once, so consumers dedupe by event ID (inbox table).</li><li><strong>Distributed locks</strong>: etcd (<code>concurrency.NewMutex</code> on a session lease) or Redis (<code>SET key token NX PX ttl</code>, release with a compare-and-delete Lua script). A lease can expire while the holder is paused (GC, network partition), so two clients may both think they hold the lock. Protect the resource with a <strong>fencing token</strong> — a monotonically increasing number (etcd revision) that the storage layer checks, rejecting writes with an older token.</li><li><strong>Leader election</strong>: <code>concurrency.NewElection(...).Campaign</code> in etcd or a Kubernetes Lease; same fencing caveat applies to whatever the leader writes.</li></ul>",
     "interview": "The senior signal is naming failure modes: lock expiry during a GC pause (fencing tokens), dual writes (outbox), retries causing double charges (idempotency keys), hot keys on a ring (virtual nodes, key splitting), and cache stampedes (singleflight, jittered TTLs). Prefer etcd/ZooKeeper (consensus) over single-node Redis when correctness matters.",
     "examples": [
      {
       "label": "etcd lock with a fencing token",
       "lang": "go",
       "code": "cli, err := clientv3.New(clientv3.Config{Endpoints: []string{\"etcd:2379\"}, DialTimeout: 5 * time.Second})\nif err != nil {\n    return err\n}\ndefer cli.Close()\n\nsess, err := concurrency.NewSession(cli, concurrency.WithTTL(10)) // lease kept alive in background\nif err != nil {\n    return err\n}\ndefer sess.Close()\n\nmu := concurrency.NewMutex(sess, \"/locks/invoice-42\")\nif err := mu.Lock(ctx); err != nil {\n    return err\n}\ndefer mu.Unlock(context.Background())\n\nfence := mu.Header().Revision // monotonically increasing across lock holders\n// The storage layer rejects writes whose token is older than the last one it saw:\n//   UPDATE invoices SET status=$1, fence=$2 WHERE id=$3 AND fence < $2\nreturn store.UpdateInvoice(ctx, 42, \"PAID\", fence)"
      },
      {
       "label": "Transactional outbox write",
       "lang": "go",
       "code": "func (s *Store) PlaceOrder(ctx context.Context, o Order) error {\n    tx, err := s.db.BeginTx(ctx, nil)\n    if err != nil {\n        return err\n    }\n    defer tx.Rollback() // no-op after Commit\n\n    if _, err := tx.ExecContext(ctx,\n        `INSERT INTO orders (id, customer_id, total_cents) VALUES ($1, $2, $3)`,\n        o.ID, o.CustomerID, o.TotalCents); err != nil {\n        return err\n    }\n    payload, err := json.Marshal(OrderPlaced{OrderID: o.ID, TotalCents: o.TotalCents})\n    if err != nil {\n        return err\n    }\n    if _, err := tx.ExecContext(ctx,\n        `INSERT INTO outbox (id, topic, payload) VALUES ($1, $2, $3)`,\n        uuid.NewString(), \"orders.placed\", payload); err != nil {\n        return err\n    }\n    return tx.Commit() // order and event are committed atomically\n}\n\n// Relay loop (separate goroutine/process):\n//   SELECT id, topic, payload FROM outbox WHERE sent_at IS NULL\n//   ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED;\n//   publish to Kafka, then UPDATE outbox SET sent_at = now() WHERE id = ANY($1);"
      }
     ]
    },
    {
     "title": "Running an LLD interview in Go",
     "def": "<p>LLD rounds grade <strong>process</strong> as much as code. A repeatable 45-minute structure:</p><ol><li><strong>Clarify</strong> (3–5 min): functional scope, scale, concurrency (single process? many goroutines?), persistence, what is out of scope.</li><li><strong>Model</strong>: nouns → types, verbs → methods. Sketch entities and relationships (ParkingLot → Levels → Spots; Ticket; PricingStrategy).</li><li><strong>APIs first</strong>: exported method signatures, errors and invariants. Use sentinel errors (<code>var ErrFull = errors.New(...)</code>) checked with <code>errors.Is</code>, <code>context.Context</code> for anything that blocks, and generics where they remove duplication (<code>Cache[K, V]</code>).</li><li><strong>Data structures &amp; complexity</strong>: say the Big-O out loud (map + doubly linked list = O(1) LRU; min-heap for timers; sorted slice + binary search for a hash ring).</li><li><strong>Concurrency model</strong>: mutex vs actor, lock granularity, what happens under contention, how Close works.</li><li><strong>Code the core</strong>: small, compiling, readable; inject clocks and randomness for testability; mention a table-driven test.</li><li><strong>Extend</strong>: persistence, distribution (sharding, consistent hashing), observability (metrics, structured logs), failure modes and trade-offs.</li></ol><p>Extension points worth naming: <strong>strategy</strong> interfaces for policies (pricing, eviction, dispatch), <strong>observer</strong> hooks for events, and <strong>functional options</strong> for configuration.</p>",
     "interview": "Narrate trade-offs as you go and keep the code compiling. Interviewers penalise silent coding, global state, ignoring concurrency, and over-engineering (ten interfaces with one implementation each). Finish by stating complexity, thread-safety guarantees and two concrete extensions.",
     "examples": [
      {
       "label": "Table-driven test with an injected clock",
       "lang": "go",
       "code": "type fakeClock struct{ t time.Time }\n\nfunc (f *fakeClock) Now() time.Time          { return f.t }\nfunc (f *fakeClock) Advance(d time.Duration) { f.t = f.t.Add(d) }\n\nfunc TestTTLExpiry(t *testing.T) {\n    clk := &fakeClock{t: time.Unix(0, 0)}\n    tests := []struct {\n        name    string\n        ttl     time.Duration\n        advance time.Duration\n        wantOK  bool\n    }{\n        {\"fresh\", time.Minute, 30 * time.Second, true},\n        {\"expired\", time.Minute, 61 * time.Second, false},\n        {\"no ttl\", 0, 24 * time.Hour, true},\n    }\n    for _, tc := range tests {\n        t.Run(tc.name, func(t *testing.T) {\n            s := NewStoreWithClock[string](clk.Now) // constructor that injects now func() time.Time\n            s.Set(\"k\", \"v\", tc.ttl)\n            clk.Advance(tc.advance)\n            if _, ok := s.Get(\"k\"); ok != tc.wantOK {\n                t.Fatalf(\"Get ok = %v, want %v\", ok, tc.wantOK)\n            }\n        })\n    }\n}"
      }
     ]
    }
   ],
   "problems": [
    {
     "t": "Configurable HTTP client with functional options",
     "d": "easy",
     "type": "coding",
     "hint": "<ul><li>Required arguments are positional (<code>baseURL</code>); everything optional is an <code>Option</code>.</li><li>Set defaults first, then apply options in order; options return <code>error</code> for validation.</li><li>Build derived state (the <code>*http.Client</code>) after all options are applied.</li><li>Adding a new option later is backwards compatible — that is the main selling point.</li></ul>",
     "solution": "package apiclient\n\nimport (\n    \"errors\"\n    \"fmt\"\n    \"net/http\"\n    \"net/url\"\n    \"time\"\n)\n\ntype Client struct {\n    base      *url.URL\n    timeout   time.Duration\n    retries   int\n    userAgent string\n    hc        *http.Client\n}\n\ntype Option func(*Client) error\n\nfunc WithTimeout(d time.Duration) Option {\n    return func(c *Client) error {\n        if d <= 0 {\n            return fmt.Errorf(\"timeout must be > 0, got %v\", d)\n        }\n        c.timeout = d\n        return nil\n    }\n}\n\nfunc WithRetries(n int) Option {\n    return func(c *Client) error {\n        if n < 0 || n > 10 {\n            return fmt.Errorf(\"retries must be in [0,10], got %d\", n)\n        }\n        c.retries = n\n        return nil\n    }\n}\n\nfunc WithUserAgent(ua string) Option {\n    return func(c *Client) error { c.userAgent = ua; return nil }\n}\n\n// WithHTTPClient injects a custom client (e.g. with a test transport).\nfunc WithHTTPClient(hc *http.Client) Option {\n    return func(c *Client) error {\n        if hc == nil {\n            return errors.New(\"http client must not be nil\")\n        }\n        c.hc = hc\n        return nil\n    }\n}\n\nfunc New(baseURL string, opts ...Option) (*Client, error) {\n    u, err := url.Parse(baseURL)\n    if err != nil || u.Scheme == \"\" || u.Host == \"\" {\n        return nil, fmt.Errorf(\"invalid base URL %q\", baseURL)\n    }\n    c := &Client{base: u, timeout: 10 * time.Second, retries: 2, userAgent: \"acme-go/1.0\"}\n    for _, opt := range opts {\n        if err := opt(c); err != nil {\n            return nil, err\n        }\n    }\n    if c.hc == nil {\n        c.hc = &http.Client{Timeout: c.timeout}\n    }\n    return c, nil\n}\n\n// Usage:\n//   c, err := apiclient.New(\"https://api.example.com\",\n//       apiclient.WithTimeout(3*time.Second), apiclient.WithRetries(3))",
     "lang": "go"
    },
    {
     "t": "LRU cache with O(1) Get/Put",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>Hash map from key → list element for O(1) lookup; doubly linked list ordered by recency (<code>container/list</code>).</li><li><code>Get</code> moves the element to the front; <code>Put</code> updates or inserts at the front and evicts from the back when over capacity.</li><li>Store the key inside the list entry so eviction can delete it from the map.</li><li>Thread safety: a single <code>sync.Mutex</code> — <code>Get</code> mutates recency, so <code>RWMutex</code> does not help. Shard for high contention.</li></ul>",
     "solution": "package lru\n\nimport (\n    \"container/list\"\n    \"sync\"\n)\n\ntype entry[K comparable, V any] struct {\n    key K\n    val V\n}\n\n// Cache is a fixed-capacity, goroutine-safe LRU cache.\ntype Cache[K comparable, V any] struct {\n    mu    sync.Mutex\n    cap   int\n    ll    *list.List          // front = most recently used\n    items map[K]*list.Element // key -> element holding *entry\n    onEvict func(K, V)\n}\n\nfunc New[K comparable, V any](capacity int, onEvict func(K, V)) *Cache[K, V] {\n    if capacity <= 0 {\n        panic(\"lru: capacity must be > 0\")\n    }\n    return &Cache[K, V]{cap: capacity, ll: list.New(), items: make(map[K]*list.Element, capacity), onEvict: onEvict}\n}\n\nfunc (c *Cache[K, V]) Get(k K) (V, bool) {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    if el, ok := c.items[k]; ok {\n        c.ll.MoveToFront(el)\n        return el.Value.(*entry[K, V]).val, true\n    }\n    var zero V\n    return zero, false\n}\n\nfunc (c *Cache[K, V]) Put(k K, v V) {\n    c.mu.Lock()\n    if el, ok := c.items[k]; ok {\n        el.Value.(*entry[K, V]).val = v\n        c.ll.MoveToFront(el)\n        c.mu.Unlock()\n        return\n    }\n    c.items[k] = c.ll.PushFront(&entry[K, V]{key: k, val: v})\n    var evicted *entry[K, V]\n    if c.ll.Len() > c.cap {\n        oldest := c.ll.Back()\n        c.ll.Remove(oldest)\n        evicted = oldest.Value.(*entry[K, V])\n        delete(c.items, evicted.key)\n    }\n    c.mu.Unlock()\n    if evicted != nil && c.onEvict != nil {\n        c.onEvict(evicted.key, evicted.val) // callback outside the lock\n    }\n}\n\nfunc (c *Cache[K, V]) Len() int {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    return c.ll.Len()\n}",
     "lang": "go"
    },
    {
     "t": "Token-bucket rate limiter (per client)",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>State: <code>tokens</code> (float), <code>capacity</code> (burst), <code>rate</code> (tokens/s), <code>last</code> refill time — refill lazily on each call: <code>tokens = min(cap, tokens + elapsed*rate)</code>. No background goroutine needed.</li><li><code>Allow()</code> is non-blocking; <code>Wait(ctx)</code> sleeps for the computed deficit and respects cancellation.</li><li>Inject the clock for deterministic tests.</li><li>Per-client limiting: map of buckets guarded by a mutex, with eviction of idle buckets (or an LRU) to bound memory. In production use <code>golang.org/x/time/rate</code>; across instances use Redis/GCRA.</li></ul>",
     "solution": "package ratelimit\n\nimport (\n    \"context\"\n    \"sync\"\n    \"time\"\n)\n\ntype TokenBucket struct {\n    mu       sync.Mutex\n    rate     float64 // tokens added per second\n    capacity float64 // maximum burst\n    tokens   float64\n    last     time.Time\n    now      func() time.Time\n}\n\nfunc NewTokenBucket(ratePerSec float64, burst int, now func() time.Time) *TokenBucket {\n    if now == nil {\n        now = time.Now\n    }\n    return &TokenBucket{rate: ratePerSec, capacity: float64(burst), tokens: float64(burst), last: now(), now: now}\n}\n\n// refill must be called with mu held.\nfunc (tb *TokenBucket) refill(t time.Time) {\n    if elapsed := t.Sub(tb.last).Seconds(); elapsed > 0 {\n        tb.tokens = min(tb.capacity, tb.tokens+elapsed*tb.rate)\n        tb.last = t\n    }\n}\n\n// AllowN reports whether n tokens are available and consumes them if so.\nfunc (tb *TokenBucket) AllowN(n int) bool {\n    tb.mu.Lock()\n    defer tb.mu.Unlock()\n    tb.refill(tb.now())\n    if tb.tokens >= float64(n) {\n        tb.tokens -= float64(n)\n        return true\n    }\n    return false\n}\n\nfunc (tb *TokenBucket) Allow() bool { return tb.AllowN(1) }\n\n// Wait blocks until one token is available or ctx is done.\nfunc (tb *TokenBucket) Wait(ctx context.Context) error {\n    for {\n        tb.mu.Lock()\n        tb.refill(tb.now())\n        if tb.tokens >= 1 {\n            tb.tokens--\n            tb.mu.Unlock()\n            return nil\n        }\n        deficit := time.Duration((1 - tb.tokens) / tb.rate * float64(time.Second))\n        tb.mu.Unlock()\n\n        timer := time.NewTimer(deficit)\n        select {\n        case <-ctx.Done():\n            timer.Stop()\n            return ctx.Err()\n        case <-timer.C: // loop and re-check: another goroutine may have taken the token\n        }\n    }\n}\n\n// KeyedLimiter keeps one bucket per client key and evicts idle buckets.\ntype KeyedLimiter struct {\n    mu      sync.Mutex\n    rate    float64\n    burst   int\n    idleTTL time.Duration\n    buckets map[string]*keyed\n}\n\ntype keyed struct {\n    tb       *TokenBucket\n    lastSeen time.Time\n}\n\nfunc NewKeyedLimiter(rate float64, burst int, idleTTL time.Duration) *KeyedLimiter {\n    return &KeyedLimiter{rate: rate, burst: burst, idleTTL: idleTTL, buckets: map[string]*keyed{}}\n}\n\nfunc (k *KeyedLimiter) Allow(key string) bool {\n    now := time.Now()\n    k.mu.Lock()\n    b, ok := k.buckets[key]\n    if !ok {\n        b = &keyed{tb: NewTokenBucket(k.rate, k.burst, nil)}\n        k.buckets[key] = b\n    }\n    b.lastSeen = now\n    k.mu.Unlock()\n    return b.tb.Allow()\n}\n\n// Sweep removes buckets idle longer than idleTTL; call it from a ticker.\nfunc (k *KeyedLimiter) Sweep() {\n    cutoff := time.Now().Add(-k.idleTTL)\n    k.mu.Lock()\n    defer k.mu.Unlock()\n    for key, b := range k.buckets {\n        if b.lastSeen.Before(cutoff) {\n            delete(k.buckets, key)\n        }\n    }\n}",
     "lang": "go"
    },
    {
     "t": "In-memory key-value store with TTL",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>Store <code>value + expiresAt</code>; zero time = no expiry.</li><li><strong>Lazy expiration</strong> on <code>Get</code> (never return stale data) + a <strong>background janitor</strong> that sweeps periodically so unread keys do not leak memory.</li><li><code>RWMutex</code> is <em>allowed</em> here because <code>Get</code> does not mutate, but it only beats a plain <code>Mutex</code> when reads dominate and run in parallel on many cores. Benchmark both with <code>b.RunParallel</code>.</li><li>Lifecycle: <code>Close</code> stops the janitor, waits for it, and is idempotent.</li><li>At scale: replace the O(n) sweep with a min-heap keyed by expiry, or Redis-style random sampling.</li></ul>",
     "solution": "package kvstore\n\nimport (\n    \"sync\"\n    \"time\"\n)\n\ntype item[V any] struct {\n    val       V\n    expiresAt time.Time // zero = never expires\n}\n\nfunc (it item[V]) expired(now time.Time) bool {\n    return !it.expiresAt.IsZero() && !now.Before(it.expiresAt)\n}\n\ntype Store[V any] struct {\n    mu        sync.RWMutex\n    data      map[string]item[V]\n    now       func() time.Time\n    stop      chan struct{}\n    done      chan struct{}\n    closeOnce sync.Once\n}\n\n// New starts a janitor that removes expired keys every sweepEvery.\nfunc New[V any](sweepEvery time.Duration) *Store[V] {\n    s := &Store[V]{\n        data: make(map[string]item[V]),\n        now:  time.Now,\n        stop: make(chan struct{}),\n        done: make(chan struct{}),\n    }\n    go s.janitor(sweepEvery)\n    return s\n}\n\nfunc (s *Store[V]) Set(key string, v V, ttl time.Duration) {\n    var exp time.Time\n    if ttl > 0 {\n        exp = s.now().Add(ttl)\n    }\n    s.mu.Lock()\n    s.data[key] = item[V]{val: v, expiresAt: exp}\n    s.mu.Unlock()\n}\n\nfunc (s *Store[V]) Get(key string) (V, bool) {\n    s.mu.RLock()\n    it, ok := s.data[key]\n    s.mu.RUnlock()\n    if !ok || it.expired(s.now()) { // lazy expiration\n        var zero V\n        return zero, false\n    }\n    return it.val, true\n}\n\nfunc (s *Store[V]) Delete(key string) {\n    s.mu.Lock()\n    delete(s.data, key)\n    s.mu.Unlock()\n}\n\n// TTL returns the remaining lifetime (0, true for keys without expiry).\nfunc (s *Store[V]) TTL(key string) (time.Duration, bool) {\n    s.mu.RLock()\n    it, ok := s.data[key]\n    s.mu.RUnlock()\n    now := s.now()\n    if !ok || it.expired(now) {\n        return 0, false\n    }\n    if it.expiresAt.IsZero() {\n        return 0, true\n    }\n    return it.expiresAt.Sub(now), true\n}\n\nfunc (s *Store[V]) janitor(every time.Duration) {\n    defer close(s.done)\n    t := time.NewTicker(every)\n    defer t.Stop()\n    for {\n        select {\n        case <-t.C:\n            s.sweep()\n        case <-s.stop:\n            return\n        }\n    }\n}\n\nfunc (s *Store[V]) sweep() {\n    now := s.now()\n    s.mu.Lock()\n    defer s.mu.Unlock()\n    for k, it := range s.data {\n        if it.expired(now) {\n            delete(s.data, k)\n        }\n    }\n}\n\n// Close stops the janitor; safe to call more than once.\nfunc (s *Store[V]) Close() {\n    s.closeOnce.Do(func() {\n        close(s.stop)\n        <-s.done\n    })\n}",
     "lang": "go"
    },
    {
     "t": "In-process pub/sub broker",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li><code>map[topic]set-of-subscribers</code> under an <code>RWMutex</code>; each subscriber has a buffered channel.</li><li><code>Publish</code> must never block on a slow subscriber: non-blocking send and count drops (alternatives: block with timeout, disconnect the slow consumer).</li><li><code>Subscribe</code> returns the channel and an idempotent unsubscribe func; only the broker closes subscriber channels, under the write lock, so a publish can never send on a closed channel.</li><li><code>Close</code> closes every subscriber channel so consumers&#39; <code>range</code> loops end.</li><li>Extensions: wildcard topics, per-subscriber goroutines, persistence + acks for at-least-once.</li></ul>",
     "solution": "package pubsub\n\nimport \"sync\"\n\ntype Message struct {\n    Topic   string\n    Payload []byte\n}\n\ntype subscriber struct {\n    ch chan Message\n}\n\ntype Broker struct {\n    mu      sync.RWMutex\n    subs    map[string]map[*subscriber]struct{}\n    bufSize int\n    closed  bool\n}\n\nfunc NewBroker(bufSize int) *Broker {\n    return &Broker{subs: make(map[string]map[*subscriber]struct{}), bufSize: bufSize}\n}\n\n// Subscribe returns a receive-only channel and an idempotent unsubscribe func.\nfunc (b *Broker) Subscribe(topic string) (<-chan Message, func()) {\n    s := &subscriber{ch: make(chan Message, b.bufSize)}\n    b.mu.Lock()\n    if b.closed {\n        b.mu.Unlock()\n        close(s.ch)\n        return s.ch, func() {}\n    }\n    if b.subs[topic] == nil {\n        b.subs[topic] = make(map[*subscriber]struct{})\n    }\n    b.subs[topic][s] = struct{}{}\n    b.mu.Unlock()\n\n    var once sync.Once\n    unsubscribe := func() {\n        once.Do(func() {\n            b.mu.Lock()\n            defer b.mu.Unlock()\n            if _, ok := b.subs[topic][s]; ok { // absent if the broker was closed\n                delete(b.subs[topic], s)\n                if len(b.subs[topic]) == 0 {\n                    delete(b.subs, topic)\n                }\n                close(s.ch)\n            }\n        })\n    }\n    return s.ch, unsubscribe\n}\n\n// Publish fans out without blocking; slow subscribers with full buffers miss the message.\nfunc (b *Broker) Publish(topic string, payload []byte) (delivered, dropped int) {\n    b.mu.RLock()\n    defer b.mu.RUnlock() // held during sends so channels cannot be closed underneath us\n    if b.closed {\n        return 0, 0\n    }\n    msg := Message{Topic: topic, Payload: payload}\n    for s := range b.subs[topic] {\n        select {\n        case s.ch <- msg:\n            delivered++\n        default:\n            dropped++ // export as a metric in production\n        }\n    }\n    return delivered, dropped\n}\n\n// Close shuts the broker down and closes all subscriber channels.\nfunc (b *Broker) Close() {\n    b.mu.Lock()\n    defer b.mu.Unlock()\n    if b.closed {\n        return\n    }\n    b.closed = true\n    for _, set := range b.subs {\n        for s := range set {\n            close(s.ch)\n        }\n    }\n    b.subs = nil\n}",
     "lang": "go"
    },
    {
     "t": "Design a parking lot",
     "d": "medium",
     "type": "design",
     "hint": "<ul><li><strong>Entities</strong>: Lot, Spot (ID, level, size), Vehicle (plate, size), Ticket (ID, plate, spot, entry time); policies as <strong>strategies</strong>: <code>PricingStrategy</code>, spot allocation (smallest fitting spot first).</li><li><strong>Data structures</strong>: free spots per size as stacks for O(1) park/leave; <code>active</code> map ticket → Ticket; <code>byPlate</code> to reject double parking.</li><li><strong>Concurrency</strong>: entry/exit gates are concurrent → one mutex around allocation (or per-level locks / sharding at scale).</li><li>Errors as sentinels: <code>ErrFull</code>, <code>ErrUnknownTicket</code>, <code>ErrAlreadyParked</code>.</li><li>Extensions: EV charging spots, reservations, multiple entry gates, display boards via observer, persistence.</li></ul>",
     "solution": "package parking\n\nimport (\n    \"errors\"\n    \"fmt\"\n    \"sync\"\n    \"time\"\n)\n\ntype SpotSize int\n\nconst (\n    Small  SpotSize = iota // motorcycle\n    Medium                 // car\n    Large                  // van / bus\n)\n\ntype Spot struct {\n    ID    string\n    Level int\n    Size  SpotSize\n}\n\ntype Ticket struct {\n    ID      string\n    Plate   string\n    Spot    Spot\n    Entered time.Time\n}\n\n// PricingStrategy computes the fee in cents.\ntype PricingStrategy interface {\n    Fee(size SpotSize, parked time.Duration) int64\n}\n\ntype HourlyPricing map[SpotSize]int64 // cents per started hour\n\nfunc (p HourlyPricing) Fee(size SpotSize, d time.Duration) int64 {\n    hours := int64((d + time.Hour - 1) / time.Hour) // round up\n    return max(1, hours) * p[size]\n}\n\nvar (\n    ErrFull          = errors.New(\"parking: no spot available\")\n    ErrUnknownTicket = errors.New(\"parking: unknown ticket\")\n    ErrAlreadyParked = errors.New(\"parking: vehicle already parked\")\n)\n\ntype Lot struct {\n    mu      sync.Mutex\n    free    map[SpotSize][]Spot // stack of free spots per size\n    active  map[string]Ticket   // ticket ID -> ticket\n    byPlate map[string]string   // plate -> ticket ID\n    pricing PricingStrategy\n    now     func() time.Time\n    seq     int\n}\n\nfunc NewLot(spots []Spot, pricing PricingStrategy, now func() time.Time) *Lot {\n    l := &Lot{free: map[SpotSize][]Spot{}, active: map[string]Ticket{}, byPlate: map[string]string{}, pricing: pricing, now: now}\n    for _, s := range spots {\n        l.free[s.Size] = append(l.free[s.Size], s)\n    }\n    return l\n}\n\n// Park assigns the smallest free spot that fits the vehicle.\nfunc (l *Lot) Park(plate string, size SpotSize) (Ticket, error) {\n    l.mu.Lock()\n    defer l.mu.Unlock()\n    if _, ok := l.byPlate[plate]; ok {\n        return Ticket{}, ErrAlreadyParked\n    }\n    for s := size; s <= Large; s++ {\n        free := l.free[s]\n        if n := len(free); n > 0 {\n            spot := free[n-1]\n            l.free[s] = free[:n-1]\n            l.seq++\n            t := Ticket{ID: fmt.Sprintf(\"T%06d\", l.seq), Plate: plate, Spot: spot, Entered: l.now()}\n            l.active[t.ID] = t\n            l.byPlate[plate] = t.ID\n            return t, nil\n        }\n    }\n    return Ticket{}, ErrFull\n}\n\n// Leave frees the spot and returns the fee for the spot size actually used.\nfunc (l *Lot) Leave(ticketID string) (int64, error) {\n    l.mu.Lock()\n    defer l.mu.Unlock()\n    t, ok := l.active[ticketID]\n    if !ok {\n        return 0, ErrUnknownTicket\n    }\n    delete(l.active, ticketID)\n    delete(l.byPlate, t.Plate)\n    l.free[t.Spot.Size] = append(l.free[t.Spot.Size], t.Spot)\n    return l.pricing.Fee(t.Spot.Size, l.now().Sub(t.Entered)), nil\n}\n\nfunc (l *Lot) Available(size SpotSize) int {\n    l.mu.Lock()\n    defer l.mu.Unlock()\n    return len(l.free[size])\n}",
     "lang": "go"
    },
    {
     "t": "Consistent hash ring with virtual nodes",
     "d": "medium",
     "type": "coding",
     "hint": "<ul><li>For each node add <code>replicas</code> virtual points <code>hash(node#i)</code> to a sorted slice plus a map point → node.</li><li><code>Get(key)</code>: binary-search the first point ≥ <code>hash(key)</code>, wrapping to index 0.</li><li><code>GetN</code> walks clockwise collecting distinct nodes — replica placement for replication factor N.</li><li>Removal deletes only that node&#39;s points; only keys on its arcs move (~K/N).</li><li>Guard with an <code>RWMutex</code> (lookups dominate) or swap immutable rings atomically.</li></ul>",
     "solution": "package hashring\n\nimport (\n    \"crypto/sha256\"\n    \"encoding/binary\"\n    \"slices\"\n    \"strconv\"\n    \"sync\"\n)\n\ntype Ring struct {\n    mu       sync.RWMutex\n    replicas int               // virtual nodes per physical node\n    points   []uint32          // sorted virtual node hashes\n    owner    map[uint32]string // point -> physical node\n    nodes    map[string]struct{}\n}\n\nfunc New(replicas int) *Ring {\n    return &Ring{replicas: replicas, owner: map[uint32]string{}, nodes: map[string]struct{}{}}\n}\n\n// hashKey must be identical in every process that shares the ring, so no random seeds.\n// SHA-256 spreads similar strings (\"node#1\", \"node#2\") far better than CRC32/FNV;\n// swap in xxhash if hashing cost shows up in profiles.\nfunc hashKey(s string) uint32 {\n    sum := sha256.Sum256([]byte(s))\n    return binary.BigEndian.Uint32(sum[:4])\n}\n\nfunc (r *Ring) Add(nodes ...string) {\n    r.mu.Lock()\n    defer r.mu.Unlock()\n    for _, n := range nodes {\n        if _, ok := r.nodes[n]; ok {\n            continue\n        }\n        r.nodes[n] = struct{}{}\n        for i := range r.replicas {\n            h := hashKey(n + \"#\" + strconv.Itoa(i))\n            if _, taken := r.owner[h]; taken {\n                continue // extremely rare collision: first owner keeps the point\n            }\n            r.owner[h] = n\n            r.points = append(r.points, h)\n        }\n    }\n    slices.Sort(r.points)\n}\n\nfunc (r *Ring) Remove(node string) {\n    r.mu.Lock()\n    defer r.mu.Unlock()\n    if _, ok := r.nodes[node]; !ok {\n        return\n    }\n    delete(r.nodes, node)\n    r.points = slices.DeleteFunc(r.points, func(h uint32) bool {\n        if r.owner[h] == node {\n            delete(r.owner, h)\n            return true\n        }\n        return false\n    })\n}\n\n// Get returns the node responsible for key.\nfunc (r *Ring) Get(key string) (string, bool) {\n    r.mu.RLock()\n    defer r.mu.RUnlock()\n    if len(r.points) == 0 {\n        return \"\", false\n    }\n    i, _ := slices.BinarySearch(r.points, hashKey(key)) // first point >= hash\n    if i == len(r.points) {\n        i = 0 // wrap around the ring\n    }\n    return r.owner[r.points[i]], true\n}\n\n// GetN returns up to n distinct nodes clockwise from key (replica set).\nfunc (r *Ring) GetN(key string, n int) []string {\n    r.mu.RLock()\n    defer r.mu.RUnlock()\n    if len(r.points) == 0 || n <= 0 {\n        return nil\n    }\n    n = min(n, len(r.nodes))\n    out := make([]string, 0, n)\n    seen := make(map[string]bool, n)\n    start, _ := slices.BinarySearch(r.points, hashKey(key))\n    for i := 0; i < len(r.points) && len(out) < n; i++ {\n        node := r.owner[r.points[(start+i)%len(r.points)]]\n        if !seen[node] {\n            seen[node] = true\n            out = append(out, node)\n        }\n    }\n    return out\n}",
     "lang": "go"
    },
    {
     "t": "LFU cache with O(1) operations",
     "d": "hard",
     "type": "coding",
     "hint": "<ul><li><code>items</code>: key → list element; <code>freqs</code>: frequency → doubly linked list of entries (front = most recent, so ties evict LRU).</li><li>Track <code>minFreq</code>. On access move the entry from list <code>f</code> to <code>f+1</code>; if list <code>f</code> becomes empty and <code>f == minFreq</code>, increment <code>minFreq</code>.</li><li>On insert when full, evict the back of <code>freqs[minFreq]</code>; then insert with freq 1 and set <code>minFreq = 1</code>.</li><li>Every operation is O(1); discuss frequency aging (new hot keys cannot displace old ones) and W-TinyLFU as the production answer.</li></ul>",
     "solution": "package lfu\n\nimport (\n    \"container/list\"\n    \"sync\"\n)\n\ntype entry[K comparable, V any] struct {\n    key  K\n    val  V\n    freq int\n}\n\ntype Cache[K comparable, V any] struct {\n    mu      sync.Mutex\n    cap     int\n    minFreq int\n    items   map[K]*list.Element\n    freqs   map[int]*list.List // freq -> entries; front = most recently used\n}\n\nfunc New[K comparable, V any](capacity int) *Cache[K, V] {\n    if capacity <= 0 {\n        panic(\"lfu: capacity must be > 0\")\n    }\n    return &Cache[K, V]{cap: capacity, items: map[K]*list.Element{}, freqs: map[int]*list.List{}}\n}\n\nfunc (c *Cache[K, V]) pushFront(e *entry[K, V]) {\n    l, ok := c.freqs[e.freq]\n    if !ok {\n        l = list.New()\n        c.freqs[e.freq] = l\n    }\n    c.items[e.key] = l.PushFront(e)\n}\n\n// touch moves an entry from frequency f to f+1.\nfunc (c *Cache[K, V]) touch(el *list.Element) *entry[K, V] {\n    e := el.Value.(*entry[K, V])\n    l := c.freqs[e.freq]\n    l.Remove(el)\n    if l.Len() == 0 {\n        delete(c.freqs, e.freq)\n        if c.minFreq == e.freq {\n            c.minFreq++\n        }\n    }\n    e.freq++\n    c.pushFront(e)\n    return e\n}\n\nfunc (c *Cache[K, V]) Get(k K) (V, bool) {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    el, ok := c.items[k]\n    if !ok {\n        var zero V\n        return zero, false\n    }\n    return c.touch(el).val, true\n}\n\nfunc (c *Cache[K, V]) Put(k K, v V) {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    if el, ok := c.items[k]; ok {\n        c.touch(el).val = v\n        return\n    }\n    if len(c.items) >= c.cap {\n        l := c.freqs[c.minFreq]\n        victim := l.Back() // least frequent, then least recent\n        l.Remove(victim)\n        if l.Len() == 0 {\n            delete(c.freqs, c.minFreq)\n        }\n        delete(c.items, victim.Value.(*entry[K, V]).key)\n    }\n    c.minFreq = 1\n    c.pushFront(&entry[K, V]{key: k, val: v, freq: 1})\n}\n\nfunc (c *Cache[K, V]) Len() int {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    return len(c.items)\n}",
     "lang": "go"
    },
    {
     "t": "Worker-pool job scheduler with retries and backoff",
     "d": "hard",
     "type": "coding",
     "hint": "<ul><li>Bounded job channel = backpressure; N workers range over it; <code>Close</code> stops intake and workers drain then exit; results channel closed after <code>WaitGroup</code> completes.</li><li>Per job: attempt with a per-attempt timeout, recover panics into errors, retry with <strong>exponential backoff + full jitter</strong>, stop on a <em>permanent</em> error (wrapped type checked with <code>errors.As</code>) or max attempts.</li><li>Respect <code>ctx</code> everywhere, including while sleeping between attempts.</li><li>Discuss delivery semantics: retries mean at-least-once, so jobs must be idempotent; add a dead-letter queue and persistence (DB/Redis/Kafka) for durability.</li></ul>",
     "solution": "package scheduler\n\nimport (\n    \"context\"\n    \"errors\"\n    \"fmt\"\n    \"math/rand/v2\"\n    \"sync\"\n    \"time\"\n)\n\ntype Job struct {\n    ID          string\n    MaxAttempts int\n    Timeout     time.Duration // per attempt; 0 = none\n    Run         func(ctx context.Context) error\n}\n\ntype Result struct {\n    JobID    string\n    Attempts int\n    Err      error\n}\n\ntype permanentError struct{ err error }\n\nfunc (p *permanentError) Error() string { return p.err.Error() }\nfunc (p *permanentError) Unwrap() error { return p.err }\n\n// Permanent marks an error as non-retryable (e.g. validation failures).\nfunc Permanent(err error) error { return &permanentError{err} }\n\ntype Pool struct {\n    workers   int\n    baseDelay time.Duration\n    maxDelay  time.Duration\n    jobs      chan Job\n    results   chan Result\n    wg        sync.WaitGroup\n    closeOnce sync.Once\n}\n\nfunc NewPool(workers, queueSize int, baseDelay, maxDelay time.Duration) *Pool {\n    return &Pool{\n        workers: workers, baseDelay: baseDelay, maxDelay: maxDelay,\n        jobs:    make(chan Job, queueSize),\n        results: make(chan Result, queueSize),\n    }\n}\n\n// Start launches the workers. Consumers must drain Results().\nfunc (p *Pool) Start(ctx context.Context) {\n    for range p.workers {\n        p.wg.Go(func() { // Go 1.25+\n            for job := range p.jobs {\n                p.results <- p.process(ctx, job)\n            }\n        })\n    }\n    go func() {\n        p.wg.Wait()\n        close(p.results)\n    }()\n}\n\n// Submit enqueues a job, blocking when the queue is full (backpressure).\nfunc (p *Pool) Submit(ctx context.Context, j Job) error {\n    select {\n    case p.jobs <- j:\n        return nil\n    case <-ctx.Done():\n        return ctx.Err()\n    }\n}\n\n// Close stops accepting jobs; workers finish the queue and exit.\nfunc (p *Pool) Close() { p.closeOnce.Do(func() { close(p.jobs) }) }\n\nfunc (p *Pool) Results() <-chan Result { return p.results }\n\nfunc (p *Pool) process(ctx context.Context, j Job) Result {\n    attempts := max(1, j.MaxAttempts)\n    for attempt := 1; ; attempt++ {\n        err := runOnce(ctx, j)\n        if err == nil {\n            return Result{JobID: j.ID, Attempts: attempt}\n        }\n        var perm *permanentError\n        if errors.As(err, &perm) || attempt >= attempts || ctx.Err() != nil {\n            return Result{JobID: j.ID, Attempts: attempt, Err: err}\n        }\n        // Exponential backoff with full jitter: sleep in [0, min(max, base*2^(n-1))].\n        backoff := min(p.maxDelay, p.baseDelay<<min(attempt-1, 30))\n        timer := time.NewTimer(time.Duration(rand.Int64N(int64(backoff) + 1)))\n        select {\n        case <-timer.C:\n        case <-ctx.Done():\n            timer.Stop()\n            return Result{JobID: j.ID, Attempts: attempt, Err: ctx.Err()}\n        }\n    }\n}\n\nfunc runOnce(ctx context.Context, j Job) (err error) {\n    if j.Timeout > 0 {\n        var cancel context.CancelFunc\n        ctx, cancel = context.WithTimeout(ctx, j.Timeout)\n        defer cancel()\n    }\n    defer func() {\n        if r := recover(); r != nil {\n            err = fmt.Errorf(\"job %s panicked: %v\", j.ID, r)\n        }\n    }()\n    return j.Run(ctx)\n}",
     "lang": "go"
    },
    {
     "t": "Design an elevator controller",
     "d": "hard",
     "type": "design",
     "hint": "<ul><li><strong>Requests</strong>: hall calls (floor + direction, any car may serve) and car calls (floor, a specific car).</li><li><strong>Per-car algorithm</strong>: LOOK/SCAN — keep moving in the current direction while stops remain ahead, then reverse; idle when none.</li><li><strong>Dispatcher</strong> (strategy): assign each hall call to the car with the lowest cost — distance, plus penalties for load and for not being on the way.</li><li><strong>Concurrency</strong>: an <strong>actor</strong> — one controller goroutine owns all car state and processes a request channel and a tick; callers never touch state directly.</li><li>Extensions: capacity/weight sensors, door timing, emergency/maintenance modes, express zones, destination dispatch, persistence of pending calls.</li></ul>",
     "solution": "package elevator\n\nimport (\n    \"context\"\n    \"fmt\"\n    \"time\"\n)\n\ntype Direction int\n\nconst (\n    Idle Direction = iota\n    Up\n    Down\n)\n\ntype Car struct {\n    ID    int\n    Floor int\n    Dir   Direction\n    stops map[int]bool\n}\n\nfunc (c *Car) hasStops(above bool) bool {\n    for f := range c.stops {\n        if (above && f > c.Floor) || (!above && f < c.Floor) {\n            return true\n        }\n    }\n    return false\n}\n\n// nextDir implements LOOK: continue while stops remain ahead, otherwise reverse or idle.\nfunc (c *Car) nextDir() Direction {\n    above, below := c.hasStops(true), c.hasStops(false)\n    switch {\n    case c.Dir == Up && above:\n        return Up\n    case c.Dir == Down && below:\n        return Down\n    case above:\n        return Up\n    case below:\n        return Down\n    default:\n        return Idle\n    }\n}\n\n// step advances one tick; it returns true when the doors open at the current floor.\nfunc (c *Car) step() bool {\n    if c.stops[c.Floor] {\n        delete(c.stops, c.Floor)\n        return true\n    }\n    c.Dir = c.nextDir()\n    switch c.Dir {\n    case Up:\n        c.Floor++\n    case Down:\n        c.Floor--\n    }\n    return false\n}\n\n// cost is the dispatch heuristic for a hall call at floor f in direction d.\nfunc (c *Car) cost(f int, d Direction) int {\n    dist := c.Floor - f\n    if dist < 0 {\n        dist = -dist\n    }\n    onTheWay := c.Dir == Idle ||\n        (c.Dir == Up && d == Up && f >= c.Floor) ||\n        (c.Dir == Down && d == Down && f <= c.Floor)\n    if onTheWay {\n        return dist + len(c.stops)\n    }\n    return dist + 2*len(c.stops) + 20 // must finish its current sweep first\n}\n\n// Call is a hall call (Car == 0) or a car call from inside car Car (IDs start at 1).\ntype Call struct {\n    Floor int\n    Dir   Direction\n    Car   int\n}\n\ntype Controller struct {\n    cars   []*Car\n    floors int\n    calls  chan Call\n}\n\nfunc NewController(numCars, floors int) *Controller {\n    c := &Controller{floors: floors, calls: make(chan Call, 64)}\n    for i := 1; i <= numCars; i++ {\n        c.cars = append(c.cars, &Car{ID: i, stops: map[int]bool{}})\n    }\n    return c\n}\n\n// Request is safe for concurrent use; state is owned by Run.\nfunc (c *Controller) Request(ctx context.Context, call Call) error {\n    if call.Floor < 0 || call.Floor >= c.floors || call.Car < 0 || call.Car > len(c.cars) {\n        return fmt.Errorf(\"invalid call %+v\", call)\n    }\n    select {\n    case c.calls <- call:\n        return nil\n    case <-ctx.Done():\n        return ctx.Err()\n    }\n}\n\nfunc (c *Controller) dispatch(call Call) {\n    if call.Car > 0 {\n        c.cars[call.Car-1].stops[call.Floor] = true\n        return\n    }\n    best := c.cars[0]\n    for _, car := range c.cars[1:] {\n        if car.cost(call.Floor, call.Dir) < best.cost(call.Floor, call.Dir) {\n            best = car\n        }\n    }\n    best.stops[call.Floor] = true\n}\n\n// Run is the single goroutine that owns all elevator state (actor model).\nfunc (c *Controller) Run(ctx context.Context, tick time.Duration, onOpen func(car, floor int)) {\n    t := time.NewTicker(tick)\n    defer t.Stop()\n    for {\n        select {\n        case <-ctx.Done():\n            return\n        case call := <-c.calls:\n            c.dispatch(call)\n        case <-t.C:\n            for _, car := range c.cars {\n                if car.step() {\n                    onOpen(car.ID, car.Floor)\n                }\n            }\n        }\n    }\n}",
     "lang": "go"
    }
   ],
   "interviewFocus": [
    {
     "q": "How do you structure dependencies and keep a Go service testable without a DI framework?",
     "a": "<ul><li><strong>Constructor injection</strong>: every component receives its collaborators (<code>NewService(repo Repo, pub Publisher, now func() time.Time, log *slog.Logger)</code>). No package-level globals for state.</li><li><strong>Consumer-owned, small interfaces</strong>: the service declares <code>type Repo interface { GetOrder(ctx, id) (Order, error) }</code> with only the methods it calls; adapters return concrete structs. Fakes in tests are a few lines.</li><li><strong>Composition root</strong>: <code>main</code> (or <code>run(ctx, args, env) error</code> called from main) reads config, builds adapters, wires services, starts servers, and handles graceful shutdown — the only place that knows concrete types.</li><li><strong>Inject non-determinism</strong>: clocks, ID generators, random sources, so tests are deterministic.</li><li><strong>Test layers</strong>: unit tests with fakes; integration tests against real Postgres/Kafka via containers; <code>httptest</code> for handlers.</li></ul><p>Frameworks such as <code>wire</code> (codegen) are acceptable when the graph is large, but reflection-based containers are generally avoided in Go because they move errors from compile time to runtime.</p>"
    },
    {
     "q": "For a new concurrent component, how do you decide between a mutex and channels?",
     "a": "<p>Decide by <strong>ownership and the shape of the interaction</strong>, not preference:</p><ul><li><strong>Mutex</strong> when many goroutines need quick access to shared state and the invariant fits in a short critical section (cache, registry, counters). Simpler, faster, easy to reason about if the lock never spans I/O or callbacks.</li><li><strong>Channels / actor</strong> when you are transferring ownership of data, coordinating stages (pipelines, worker pools), signalling events (done, cancellation), or when state transitions are complex and sequential (state machine, scheduler). A single owner goroutine eliminates lock ordering problems.</li><li><strong>Atomics / copy-on-write</strong> for single values or read-mostly snapshots.</li></ul><p>Then check the costs: an actor serialises all operations through one goroutine (throughput ceiling, and every call needs a reply channel), while mutexes can suffer contention (fix with sharding). Either way: bounded queues, idempotent <code>Close</code>, context-aware blocking calls, and tests with <code>-race</code>.</p>"
    },
    {
     "q": "Explain consistent hashing. What happens when a node joins, and why use virtual nodes?",
     "a": "<p>Nodes and keys are hashed onto the same ring (e.g. 32-bit space). A key is owned by the first node clockwise from its hash. With <code>hash(key) % N</code>, changing N remaps almost every key; with a ring, a joining node only takes over the arc between itself and its predecessor — about <strong>K/N</strong> keys move, all from its successor.</p><ul><li><strong>Problem</strong>: with one point per node, arcs are uneven (some nodes get several times the average load) and a leaving node dumps its whole arc onto a single neighbour.</li><li><strong>Virtual nodes</strong>: each physical node owns 100–200 points (<code>hash(node#i)</code>). Load evens out statistically, a departing node&#39;s keys spread across many nodes, and weights are just different vnode counts.</li><li><strong>Replication</strong>: walk clockwise to collect N <em>distinct</em> physical nodes (skip vnodes of nodes already chosen; optionally different zones).</li><li><strong>Implementation</strong>: sorted slice of points + binary search = O(log V) lookup; rebuild and atomically swap the ring on membership changes.</li><li><strong>Alternatives</strong>: rendezvous hashing (no ring, O(N) lookup, perfect balance), jump consistent hash (O(1) memory, but nodes are numbered buckets), bounded-load consistent hashing for hot keys.</li></ul>"
    },
    {
     "q": "Why is a lease-based distributed lock unsafe on its own, and how do fencing tokens fix it? Redis or etcd?",
     "a": "<p>A lease lock grants ownership for a TTL. The holder can be paused (stop-the-world GC, VM migration, long network delay) past its TTL without noticing; the lock expires, another client acquires it, and now <strong>two clients act as owner</strong>. Clocks drifting makes this worse. Checking \"do I still hold it?\" before writing does not help — the pause can occur right after the check.</p><p><strong>Fencing</strong>: each acquisition returns a strictly increasing token (etcd revision of the lock key, ZooKeeper zxid). Every write to the protected resource includes the token, and the <em>resource</em> rejects tokens older than the highest it has seen (<code>UPDATE ... WHERE fence &lt; $token</code>). A stale holder&#39;s writes are refused.</p><ul><li><strong>etcd/ZooKeeper</strong>: consensus-backed (Raft/ZAB), linearizable, sessions with keep-alive leases, revisions usable as fencing tokens — use when correctness matters.</li><li><strong>Redis</strong> <code>SET key token NX PX ttl</code> + compare-and-delete Lua: fine for efficiency locks (avoid duplicate work) where an occasional double execution is tolerable; a single primary with async replication can lose the lock on failover, and Redlock remains debated.</li><li>Best of all, design the operation to be idempotent so duplicate execution is harmless.</li></ul>"
    },
    {
     "q": "How do you get effectively-once processing for \"charge the customer and emit an event\"?",
     "a": "<p>Exactly-once delivery across a network is impossible; you combine <strong>at-least-once delivery</strong> with <strong>idempotent processing</strong>:</p><ol><li><strong>Idempotency key at the API</strong>: the client generates a key per logical operation and retries with the same key. The server inserts it under a unique constraint in the same transaction as the charge record; a retry finds the key and replays the stored response; a concurrent duplicate gets a conflict/\"in progress\".</li><li><strong>Transactional outbox</strong>: the charge row and an <code>outbox</code> event row commit in one DB transaction, so there is no state where money moved but no event exists (or vice versa). A relay publishes outbox rows (polling with <code>SKIP LOCKED</code> or CDC) and marks them sent; crashes cause re-publication, never loss.</li><li><strong>Idempotent consumers</strong>: each event carries a unique ID; consumers record processed IDs (inbox table / unique constraint) in the same transaction as their side effects, or make the effect naturally idempotent (upserts, version checks).</li><li>Downstream calls to payment providers also pass idempotency keys (Stripe-style), so retries never double-charge.</li></ol><p>Mention ordering (partition by aggregate ID), outbox cleanup, and monitoring relay lag.</p>"
    }
   ],
   "quiz": [
    {
     "q": "What does \"accept interfaces, return structs\" mean?",
     "a": "Functions take small interfaces describing only the behaviour they need (decoupling, easy fakes) but return concrete types so callers get full functionality and you avoid premature abstraction."
    },
    {
     "q": "What does the internal/ directory do in a Go module?",
     "a": "Packages under internal/ can only be imported by code rooted at the parent of internal/; the go tool enforces this, hiding implementation details from other modules."
    },
    {
     "q": "Why does an LRU cache Get need a full Mutex rather than an RLock?",
     "a": "Get mutates shared state (moves the entry to the front of the recency list), so concurrent Gets would race under a read lock."
    },
    {
     "q": "What does sync.OnceValues provide over sync.Once?",
     "a": "It wraps a function returning (T, error), runs it once, and returns the cached value and error to every caller (Go 1.21+), avoiding hand-written globals."
    },
    {
     "q": "Roughly how many keys move when a node is added to a consistent hash ring of N nodes holding K keys?",
     "a": "About K/(N+1), taken from the neighbouring arcs; with modulo hashing nearly all keys would move."
    },
    {
     "q": "What problem does the transactional outbox pattern solve?",
     "a": "The dual-write problem: it makes a database change and the corresponding event publication atomic by writing the event to an outbox table in the same transaction and relaying it later."
    },
    {
     "q": "What is a fencing token?",
     "a": "A monotonically increasing number issued with each lock acquisition; the protected resource rejects requests with a token older than the latest seen, neutralising stale lock holders."
    },
    {
     "q": "Why does an LFU cache keep a minFreq variable?",
     "a": "So eviction can find the least-frequently-used bucket in O(1) instead of scanning all frequencies."
    }
   ],
   "resources": [
    {
     "title": "Refactoring.Guru — Design Patterns in Go",
     "url": "https://refactoring.guru/design-patterns/go",
     "type": "article"
    },
    {
     "title": "Go Blog — Go Concurrency Patterns: Pipelines and cancellation",
     "url": "https://go.dev/blog/pipelines",
     "type": "article"
    },
    {
     "title": "Organizing a Go module (official layout guide)",
     "url": "https://go.dev/doc/modules/layout",
     "type": "docs"
    },
    {
     "title": "etcd client v3 concurrency package (locks, elections)",
     "url": "https://pkg.go.dev/go.etcd.io/etcd/client/v3/concurrency",
     "type": "docs"
    }
   ]
  }
 ],
 "tracks": {
  "google": {
   "name": "Google",
   "icon": "🔍",
   "color": "#4285F4",
   "desc": "SRE, gRPC, K8s, Googleyness",
   "resources": [
    {
     "title": "Go gRPC Tutorial",
     "url": "https://www.youtube.com/watch?v=YzLrWHZa-Kc",
     "type": "video"
    },
    {
     "title": "K8s with Go",
     "url": "https://www.youtube.com/c/golang",
     "type": "video"
    }
   ],
   "weeks": [
    {
     "week": 9,
     "title": "Google-Scale System Design",
     "problems": [
      "Distributed KV store",
      "Real-time analytics",
      "Global DB",
      "CDN",
      "Messaging at scale",
      "Search engine",
      "File storage",
      "Recommendation engine",
      "Rate limiter",
      "Config service"
     ]
    },
    {
     "week": 10,
     "title": "Production Debugging",
     "problems": [
      "Distributed tracing",
      "Log aggregation",
      "Metrics + alerting",
      "Circuit breaker",
      "Health checks",
      "Adaptive rate limiting",
      "Retry + backoff",
      "Deadlock detection",
      "Memory leak detector",
      "Graceful shutdown"
     ]
    },
    {
     "week": 11,
     "title": "Behavioral — Googleyness",
     "problems": [
      "STAR: technical problem",
      "STAR: difficult team",
      "STAR: ambiguity",
      "STAR: incomplete info",
      "STAR: speed vs quality",
      "Non-tech explanation",
      "Mock: technical",
      "Mock: system design",
      "Mock: behavioral",
      "Google values"
     ]
    },
    {
     "week": 12,
     "title": "Google Technologies",
     "problems": [
      "gRPC streaming",
      "Protocol Buffers",
      "K8s operator",
      "Bigtable-style",
      "Chubby lock mgr",
      "Paxos consensus",
      "MapReduce",
      "Consistent hashing",
      "Bloom filter",
      "Merkle tree"
     ]
    },
    {
     "week": 13,
     "title": "Advanced System Design",
     "problems": [
      "Multi-master replication",
      "Petabyte analytics",
      "Distributed cache",
      "Exactly-once queue",
      "Distributed search",
      "Time-series DB",
      "Graph DB",
      "Auto-sharding",
      "Distributed FS",
      "Real-time recs"
     ]
    },
    {
     "week": 14,
     "title": "Performance",
     "problems": [
      "pprof profiling",
      "Memory pool",
      "CPU goroutines",
      "HTTP conn pool",
      "DB optimization",
      "Batch processing",
      "TTL cache",
      "JSON optimization",
      "Zero-copy",
      "Concurrent profiling"
     ]
    },
    {
     "week": 15,
     "title": "Capstone",
     "problems": [
      "Architecture",
      "Distributed patterns",
      "gRPC layer",
      "Observability",
      "Tests",
      "K8s deploy",
      "API docs",
      "CI/CD",
      "Perf test",
      "Presentation"
     ]
    },
    {
     "week": 16,
     "title": "Final Prep",
     "problems": [
      "Complete capstone",
      "STAR stories",
      "LeetCode",
      "System design",
      "Go internals",
      "CR patterns",
      "GitHub",
      "Mock interviews",
      "Google prep",
      "Questions"
     ]
    }
   ]
  },
  "meta": {
   "name": "Meta",
   "icon": "📱",
   "color": "#0668E1",
   "desc": "GraphQL, real-time, Move Fast",
   "resources": [
    {
     "title": "GraphQL with Go",
     "url": "https://www.youtube.com/watch?v=7q6q9tLwXeU",
     "type": "video"
    }
   ],
   "weeks": [
    {
     "week": 9,
     "title": "Real-Time Systems",
     "problems": [
      "Chat billions",
      "Social graph",
      "News feed",
      "Photo/video",
      "Notifications",
      "Ad targeting",
      "E2E encryption",
      "Live streaming",
      "Analytics",
      "Moderation"
     ]
    },
    {
     "week": 10,
     "title": "Move Fast",
     "problems": [
      "Feature flags",
      "A/B testing",
      "Canary deploy",
      "Blue-green",
      "Hot-reload",
      "Schema migration",
      "A/B pipeline",
      "Metrics dashboard",
      "Deploy automation",
      "Rollback"
     ]
    },
    {
     "week": 11,
     "title": "Behavioral — Meta",
     "problems": [
      "STAR: moved fast",
      "STAR: status quo",
      "STAR: social value",
      "STAR: limited resources",
      "STAR: speed>perfection",
      "PM explanation",
      "Mock: technical",
      "Mock: system design",
      "Mock: behavioral",
      "Engineering blog"
     ]
    },
    {
     "week": 12,
     "title": "Meta Technologies",
     "problems": [
      "GraphQL",
      "Thrift",
      "TAO store",
      "Memcache",
      "Cassandra",
      "RT graph",
      "Recommendations",
      "Event streaming",
      "Media CDN",
      "Privacy analytics"
     ]
    },
    {
     "week": 13,
     "title": "Advanced RT",
     "problems": [
      "Social graph",
      "Event sourcing",
      "Engagement",
      "Billion-user graph",
      "RT notifications",
      "Content recs",
      "Chat+presence",
      "Feed ranking",
      "A/B platform",
      "Privacy"
     ]
    },
    {
     "week": 14,
     "title": "Performance",
     "problems": [
      "DataLoader",
      "Graph traversal",
      "WebSocket mgmt",
      "Multi-cache",
      "Cassandra opt",
      "Cache invalidation",
      "Event pipeline",
      "Conn pool",
      "Graph queries",
      "Profiling"
     ]
    },
    {
     "week": 15,
     "title": "Capstone — Social",
     "problems": [
      "GraphQL API",
      "WebSocket",
      "Graph algos",
      "Caching",
      "Tests",
      "Deploy",
      "Docs",
      "CI/CD",
      "Perf",
      "Presentation"
     ]
    },
    {
     "week": 16,
     "title": "Final — Meta",
     "problems": [
      "Complete capstone",
      "STAR stories",
      "LeetCode",
      "System design",
      "GraphQL",
      "RT patterns",
      "GitHub",
      "Mock interviews",
      "Blog",
      "Questions"
     ]
    }
   ]
  },
  "amazon": {
   "name": "Amazon",
   "icon": "📦",
   "color": "#FF9900",
   "desc": "AWS, Leadership Principles",
   "resources": [
    {
     "title": "AWS SDK for Go",
     "url": "https://www.youtube.com/@AkhilSharmaTech",
     "type": "video"
    }
   ],
   "weeks": [
    {
     "week": 9,
     "title": "AWS Cloud",
     "problems": [
      "S3 storage",
      "DynamoDB",
      "SQS queue",
      "Kinesis",
      "Lambda",
      "CloudFront",
      "ELB",
      "DDB KV",
      "S3 files",
      "SNS"
     ]
    },
    {
     "week": 10,
     "title": "Leadership Principles",
     "problems": [
      "Customer Obsession",
      "Ownership",
      "Invent & Simplify",
      "Working backwards",
      "Bias for Action",
      "Priorities",
      "Dive deep",
      "Earn trust",
      "Learn",
      "Deadlines"
     ]
    },
    {
     "week": 11,
     "title": "Behavioral — Amazon",
     "problems": [
      "Operational Excellence",
      "Frugality",
      "Learn & Be Curious",
      "Limited resources",
      "Tradeoffs",
      "Tech debt",
      "Mentoring",
      "Escalation",
      "Knowledge share",
      "Production issue"
     ]
    },
    {
     "week": 12,
     "title": "Amazon Tech",
     "problems": [
      "DDB partitioning",
      "S3 versioning",
      "Lambda orchestration",
      "SQS impl",
      "SNS pub/sub",
      "Kinesis streaming",
      "DDB locks",
      "API Gateway",
      "CloudFront",
      "DDB KV"
     ]
    },
    {
     "week": 13,
     "title": "Advanced AWS",
     "problems": [
      "Multi-region",
      "Data lake",
      "EventBridge",
      "Step Functions",
      "Cost opt",
      "Multi-account",
      "Kinesis ETL",
      "Global CDN",
      "DR",
      "Hybrid"
     ]
    },
    {
     "week": 14,
     "title": "AWS Performance",
     "problems": [
      "Lambda cold",
      "DDB partitions",
      "S3 multipart",
      "API GW cache",
      "Auto-scaling",
      "Kinesis proc",
      "Step Functions",
      "CloudFront",
      "SQS proc",
      "Serverless"
     ]
    },
    {
     "week": 15,
     "title": "Capstone — Serverless",
     "problems": [
      "Architecture",
      "Lambda+GW+DDB",
      "IaC",
      "Security",
      "Tests",
      "CI/CD",
      "Cost docs",
      "CloudWatch",
      "Perf",
      "Presentation"
     ]
    },
    {
     "week": 16,
     "title": "Final — Amazon",
     "problems": [
      "Complete",
      "STAR stories",
      "LeetCode",
      "System design",
      "Architecture",
      "Patterns",
      "GitHub",
      "Mock",
      "Well-Architected",
      "Questions"
     ]
    }
   ]
  },
  "netflix": {
   "name": "Netflix",
   "icon": "🎬",
   "color": "#E50914",
   "desc": "Chaos engineering, resilience",
   "resources": [
    {
     "title": "Circuit Breakers",
     "url": "https://www.youtube.com/watch?v=KXeQ1Qp8t0k",
     "type": "video"
    }
   ],
   "weeks": [
    {
     "week": 9,
     "title": "Streaming Architecture",
     "problems": [
      "Adaptive bitrate",
      "Recommendation",
      "Chaos platform",
      "Service discovery",
      "API gateway",
      "RT analytics",
      "CDN",
      "Video encoding",
      "A/B testing",
      "Quality monitoring"
     ]
    },
    {
     "week": 10,
     "title": "Chaos Engineering",
     "problems": [
      "Circuit breaker",
      "Bulkhead",
      "Retry+backoff",
      "Timeout",
      "Rate limiter",
      "Fault injection",
      "Health check",
      "Degradation",
      "Fallback",
      "Distributed tracing"
     ]
    },
    {
     "week": 11,
     "title": "Behavioral — Netflix",
     "problems": [
      "Freedom+Responsibility",
      "Context not control",
      "Innovation",
      "Challenge assumptions",
      "UX passion",
      "Ambiguity",
      "Calculated risks",
      "Cross-team",
      "Quality",
      "Under pressure"
     ]
    },
    {
     "week": 12,
     "title": "Netflix Tech",
     "problems": [
      "Hystrix",
      "Eureka",
      "Zuul",
      "Archaius",
      "Bulkhead",
      "Fallback",
      "Retry",
      "Tracing",
      "Resilience test",
      "Health check"
     ]
    },
    {
     "week": 13,
     "title": "Advanced Resilience",
     "problems": [
      "Chaos platform",
      "Service mesh",
      "Tracing",
      "Circuit breaker scale",
      "Degradation",
      "Multi-region",
      "Monitoring",
      "Self-healing",
      "Rate limiting",
      "Fault injection"
     ]
    },
    {
     "week": 14,
     "title": "Streaming Perf",
     "problems": [
      "Bitrate opt",
      "CDN cache",
      "Transcoding",
      "Rec cache",
      "Analytics",
      "Quality adapt",
      "CDN routing",
      "Protocol",
      "Algorithm",
      "Profiling"
     ]
    },
    {
     "week": 15,
     "title": "Capstone — Streaming",
     "problems": [
      "Architecture",
      "Resilience patterns",
      "Chaos testing",
      "Observability",
      "Tests",
      "K8s",
      "Docs",
      "CI/CD",
      "Perf",
      "Presentation"
     ]
    },
    {
     "week": 16,
     "title": "Final — Netflix",
     "problems": [
      "Complete",
      "STAR stories",
      "LeetCode",
      "System design",
      "Resilience",
      "Chaos eng",
      "GitHub",
      "Mock",
      "Tech talks",
      "Questions"
     ]
    }
   ]
  },
  "microsoft": {
   "name": "Microsoft",
   "icon": "🪟",
   "color": "#00A4EF",
   "desc": "Azure, enterprise, growth mindset",
   "resources": [
    {
     "title": "Azure SDK for Go",
     "url": "https://www.youtube.com/c/golang",
     "type": "video"
    }
   ],
   "weeks": [
    {
     "week": 9,
     "title": "Azure Enterprise",
     "problems": [
      "Azure Functions",
      "Cosmos DB",
      "Azure Storage",
      "Azure SQL",
      "Service Fabric",
      "Service Bus",
      "Stream Analytics",
      "Front Door",
      "Load Balancer",
      "Cosmos KV"
     ]
    },
    {
     "week": 10,
     "title": "Enterprise Patterns",
     "problems": [
      "Event sourcing",
      "CQRS",
      "Saga",
      "SOAP client",
      "LDAP auth",
      "SAML SSO",
      "Message queue",
      "Batch processing",
      "Validation",
      "Config mgmt"
     ]
    },
    {
     "week": 11,
     "title": "Behavioral — Microsoft",
     "problems": [
      "Growth mindset",
      "One Microsoft",
      "Customer focus",
      "Legacy systems",
      "Quality",
      "Security",
      "Learn fast",
      "Cross-org",
      "Accessibility",
      "Constraints"
     ]
    },
    {
     "week": 12,
     "title": "Microsoft Tech",
     "problems": [
      "Azure Functions",
      "Cosmos DB",
      "Azure SQL",
      "Storage",
      "Service Bus",
      "Stream Analytics",
      "Front Door",
      "Redis",
      "Cosmos KV",
      "API Mgmt"
     ]
    },
    {
     "week": 13,
     "title": "Advanced Azure",
     "problems": [
      "Hybrid cloud",
      "Geo-replication",
      "Azure Policy",
      "Multi-tenant",
      "Cost opt",
      "DR",
      "Data pipeline",
      "Azure AD",
      "Compliance",
      "CDN"
     ]
    },
    {
     "week": 14,
     "title": "Azure Perf",
     "problems": [
      "Functions cold",
      "Cosmos partitions",
      "SQL indexing",
      "Storage tiers",
      "Service Bus",
      "Functions scale",
      "Redis",
      "Stream queries",
      "API routing",
      "Profiling"
     ]
    },
    {
     "week": 15,
     "title": "Capstone — Enterprise",
     "problems": [
      "Architecture",
      "Azure integration",
      "AD+Key Vault",
      "Monitor+Insights",
      "Tests",
      "DevOps/Terraform",
      "Docs",
      "CI/CD",
      "Perf",
      "Presentation"
     ]
    },
    {
     "week": 16,
     "title": "Final — Microsoft",
     "problems": [
      "Complete",
      "STAR stories",
      "LeetCode",
      "System design",
      "Architecture",
      "Patterns",
      "GitHub",
      "Mock",
      "Blog",
      "Questions"
     ]
    }
   ]
  }
 },
 "practice": {
  "title": "LeetCode Top 30",
  "items": [
   {
    "t": "Two Sum",
    "n": 1,
    "cat": "Hash map",
    "d": "easy",
    "url": "https://leetcode.com/problems/two-sum/"
   },
   {
    "t": "Merge Two Sorted Lists",
    "n": 21,
    "cat": "Linked list",
    "d": "easy",
    "url": "https://leetcode.com/problems/merge-two-sorted-lists/"
   },
   {
    "t": "Valid Parentheses",
    "n": 20,
    "cat": "Stack",
    "d": "easy",
    "url": "https://leetcode.com/problems/valid-parentheses/"
   },
   {
    "t": "Reverse Linked List",
    "n": 206,
    "cat": "Linked list",
    "d": "easy",
    "url": "https://leetcode.com/problems/reverse-linked-list/"
   },
   {
    "t": "Binary Tree Inorder Traversal",
    "n": 94,
    "cat": "DFS",
    "d": "easy",
    "url": "https://leetcode.com/problems/binary-tree-inorder-traversal/"
   },
   {
    "t": "Maximum Depth of Binary Tree",
    "n": 104,
    "cat": "DFS",
    "d": "easy",
    "url": "https://leetcode.com/problems/maximum-depth-of-binary-tree/"
   },
   {
    "t": "Same Tree",
    "n": 100,
    "cat": "DFS",
    "d": "easy",
    "url": "https://leetcode.com/problems/same-tree/"
   },
   {
    "t": "Merge Sorted Array",
    "n": 88,
    "cat": "Two pointers",
    "d": "easy",
    "url": "https://leetcode.com/problems/merge-sorted-array/"
   },
   {
    "t": "Best Time to Buy and Sell Stock",
    "n": 121,
    "cat": "DP",
    "d": "easy",
    "url": "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/"
   },
   {
    "t": "Valid Palindrome",
    "n": 125,
    "cat": "Two pointers",
    "d": "easy",
    "url": "https://leetcode.com/problems/valid-palindrome/"
   },
   {
    "t": "Single Number",
    "n": 136,
    "cat": "Bit manipulation",
    "d": "easy",
    "url": "https://leetcode.com/problems/single-number/"
   },
   {
    "t": "Majority Element",
    "n": 169,
    "cat": "Hash map",
    "d": "easy",
    "url": "https://leetcode.com/problems/majority-element/"
   },
   {
    "t": "Climbing Stairs",
    "n": 70,
    "cat": "DP",
    "d": "easy",
    "url": "https://leetcode.com/problems/climbing-stairs/"
   },
   {
    "t": "House Robber",
    "n": 198,
    "cat": "DP",
    "d": "medium",
    "url": "https://leetcode.com/problems/house-robber/"
   },
   {
    "t": "LRU Cache",
    "n": 146,
    "cat": "Design",
    "d": "medium",
    "url": "https://leetcode.com/problems/lru-cache/"
   },
   {
    "t": "Implement Trie",
    "n": 208,
    "cat": "Design",
    "d": "medium",
    "url": "https://leetcode.com/problems/implement-trie-prefix-tree/"
   },
   {
    "t": "Kth Largest Element",
    "n": 215,
    "cat": "Heap",
    "d": "medium",
    "url": "https://leetcode.com/problems/kth-largest-element-in-an-array/"
   },
   {
    "t": "Number of Islands",
    "n": 200,
    "cat": "DFS/BFS",
    "d": "medium",
    "url": "https://leetcode.com/problems/number-of-islands/"
   },
   {
    "t": "Course Schedule",
    "n": 207,
    "cat": "Graph",
    "d": "medium",
    "url": "https://leetcode.com/problems/course-schedule/"
   },
   {
    "t": "Word Search",
    "n": 79,
    "cat": "Backtracking",
    "d": "medium",
    "url": "https://leetcode.com/problems/word-search/"
   },
   {
    "t": "Subsets",
    "n": 78,
    "cat": "Backtracking",
    "d": "medium",
    "url": "https://leetcode.com/problems/subsets/"
   },
   {
    "t": "Permutations",
    "n": 46,
    "cat": "Backtracking",
    "d": "medium",
    "url": "https://leetcode.com/problems/permutations/"
   },
   {
    "t": "Word Break",
    "n": 139,
    "cat": "DP",
    "d": "medium",
    "url": "https://leetcode.com/problems/word-break/"
   },
   {
    "t": "Product of Array Except Self",
    "n": 238,
    "cat": "Array",
    "d": "medium",
    "url": "https://leetcode.com/problems/product-of-array-except-self/"
   },
   {
    "t": "Maximum Subarray",
    "n": 53,
    "cat": "DP",
    "d": "medium",
    "url": "https://leetcode.com/problems/maximum-subarray/"
   },
   {
    "t": "Container With Most Water",
    "n": 11,
    "cat": "Two pointers",
    "d": "medium",
    "url": "https://leetcode.com/problems/container-with-most-water/"
   },
   {
    "t": "3Sum",
    "n": 15,
    "cat": "Two pointers",
    "d": "medium",
    "url": "https://leetcode.com/problems/3sum/"
   },
   {
    "t": "Group Anagrams",
    "n": 49,
    "cat": "Hash map",
    "d": "medium",
    "url": "https://leetcode.com/problems/group-anagrams/"
   },
   {
    "t": "Longest Substring Without Repeating",
    "n": 3,
    "cat": "Sliding window",
    "d": "medium",
    "url": "https://leetcode.com/problems/longest-substring-without-repeating-characters/"
   },
   {
    "t": "Coin Change",
    "n": 322,
    "cat": "DP",
    "d": "medium",
    "url": "https://leetcode.com/problems/coin-change/"
   }
  ]
 },
 "flashcards": [
  {
   "q": "Zero values in Go?",
   "a": "int: 0, string: \"\", bool: false, pointer/slice/map/chan: nil, struct: all fields zero.",
   "d": 1,
   "cat": "fundamentals"
  },
  {
   "q": "What is :=?",
   "a": "Short variable declaration with type inference. Only inside functions.",
   "d": 1,
   "cat": "fundamentals"
  },
  {
   "q": "Why no while?",
   "a": "for handles all loops: for cond{}, for{}, for range.",
   "d": 1,
   "cat": "fundamentals"
  },
  {
   "q": "How defer works?",
   "a": "Schedules call for function return. LIFO order. Args evaluated at defer statement.",
   "d": 2,
   "cat": "fundamentals"
  },
  {
   "q": "Slice vs Array?",
   "a": "Array: fixed, value type. Slice: dynamic, reference to underlying array.",
   "d": 1,
   "cat": "data_structures"
  },
  {
   "q": "Append past capacity?",
   "a": "growslice allocates a bigger array (2x while small, smoothly ~1.25x from ~256 elements, rounded up to a size class) and copies, which is why append returns a new slice header.",
   "d": 2,
   "cat": "data_structures"
  },
  {
   "q": "Interfaces in Go?",
   "a": "Satisfied implicitly. No 'implements' keyword. Duck typing at compile time.",
   "d": 1,
   "cat": "oop"
  },
  {
   "q": "Value vs pointer receiver?",
   "a": "Value: copy. Pointer: original, can modify. Pointer needed for interface with pointer methods.",
   "d": 2,
   "cat": "oop"
  },
  {
   "q": "What is a goroutine?",
   "a": "A runtime-managed lightweight thread: ~2 KB growable stack (vs a typically 8 MB virtual stack per Linux OS thread), started with go, M:N scheduled and preemptible.",
   "d": 1,
   "cat": "concurrency"
  },
  {
   "q": "Buffered vs unbuffered channel?",
   "a": "Unbuffered: synchronizes both sides. Buffered: has capacity.",
   "d": 2,
   "cat": "concurrency"
  },
  {
   "q": "context.Context?",
   "a": "Carries deadlines, cancellation, request-scoped values across API boundaries.",
   "d": 2,
   "cat": "concurrency"
  },
  {
   "q": "Race condition?",
   "a": "Output depends on goroutine timing. Detect: go run -race.",
   "d": 2,
   "cat": "concurrency"
  },
  {
   "q": "HTTP handler?",
   "a": "func(w http.ResponseWriter, r *http.Request)",
   "d": 1,
   "cat": "networking"
  },
  {
   "q": "Middleware pattern?",
   "a": "func(next http.Handler) http.Handler — wraps handler for cross-cutting concerns.",
   "d": 2,
   "cat": "networking"
  },
  {
   "q": "SQL injection prevention?",
   "a": "Parameterized queries: db.Query(\"SELECT * WHERE id=$1\", id). Never concatenate.",
   "d": 1,
   "cat": "database"
  },
  {
   "q": "Generics?",
   "a": "func Max[T comparable](s []T) T — type-safe, since Go 1.18.",
   "d": 2,
   "cat": "advanced"
  },
  {
   "q": "Generics vs interfaces?",
   "a": "Generics: type-safe containers. Interfaces: polymorphic behavior.",
   "d": 3,
   "cat": "advanced"
  },
  {
   "q": "Reflection?",
   "a": "Runtime type examination via reflect package. Slow but powerful.",
   "d": 3,
   "cat": "advanced"
  },
  {
   "q": "make vs new?",
   "a": "make: slices/maps/channels (initialized). new: allocates, returns pointer.",
   "d": 1,
   "cat": "fundamentals"
  },
  {
   "q": "Error wrapping?",
   "a": "fmt.Errorf(\"%w\", err) preserves chain. Check: errors.Is/As.",
   "d": 2,
   "cat": "oop"
  },
  {
   "q": "Why can a Go server handle 100k idle TCP connections with goroutine-per-connection?",
   "a": "Sockets are non-blocking and registered with the runtime netpoller (epoll/kqueue/IOCP); a blocked Read parks only the goroutine, not an OS thread.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "How do you implement an idle timeout on a net.Conn?",
   "a": "Call conn.SetReadDeadline(time.Now().Add(d)) before every Read; a timeout returns an error matching os.ErrDeadlineExceeded.",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "Why do TCP protocols need framing, and which helper reads an exact number of bytes?",
   "a": "TCP is a byte stream with no message boundaries; use delimiters or length prefixes, and io.ReadFull to read exactly n bytes.",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "Pure-Go vs cgo DNS resolver: key difference?",
   "a": "Pure Go parks goroutines during lookups; cgo calls getaddrinfo and occupies an OS thread per in-flight lookup. Force pure Go with GODEBUG=netdns=go, -tags netgo or CGO_ENABLED=0.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Default http.Transport MaxIdleConnsPerHost?",
   "a": "2 — raise it for proxies and busy clients, otherwise connections churn and TIME_WAIT sockets pile up.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Why is gRPC unbalanced behind a Kubernetes ClusterIP Service?",
   "a": "ClusterIP balances per TCP connection (L4) and gRPC multiplexes all RPCs over one long-lived HTTP/2 connection. Use a headless Service with client-side round_robin, or an L7 proxy/mesh.",
   "d": 3,
   "cat": "cloud-native"
  },
  {
   "q": "What is JWT algorithm confusion and how do you prevent it in golang-jwt v5?",
   "a": "An attacker switches alg (e.g. RS256 to HS256 or none) so the verifier misuses key material. Pin algorithms with jwt.WithValidMethods and return a typed key such as *rsa.PublicKey.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Which golang-jwt v5 options enforce audience, issuer and expiry?",
   "a": "jwt.WithAudience, jwt.WithIssuer and jwt.WithExpirationRequired (plus WithLeeway for clock skew).",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "state vs nonce vs PKCE in an OIDC login?",
   "a": "state blocks login CSRF on the redirect; nonce binds the ID token to this login (replay protection); PKCE makes a stolen authorization code useless without the code_verifier.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "mTLS server config in Go: which two tls.Config fields?",
   "a": "ClientAuth: tls.RequireAndVerifyClientCert and ClientCAs (the pool client certs must chain to). Then authorize by the peer identity (SAN / SPIFFE ID).",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Which cookie attributes should a session cookie have?",
   "a": "HttpOnly, Secure, SameSite=Lax (or Strict), a bounded MaxAge, and ideally the __Host- name prefix (Path=/, no Domain).",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "Which password hashing algorithms should Go services use?",
   "a": "argon2id (golang.org/x/crypto/argon2.IDKey) or bcrypt (golang.org/x/crypto/bcrypt), with per-user salts and tuned cost; never fast hashes like SHA-256.",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "How do you compare secrets without leaking timing information?",
   "a": "subtle.ConstantTimeCompare (crypto/subtle) or hmac.Equal — never == or bytes.Equal.",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "Liveness vs readiness vs startup probe?",
   "a": "Liveness: restart if wedged (no dependency checks). Readiness: remove from endpoints when it can't serve (warm-up, draining, deps down). Startup: holds off the other probes while a slow app boots.",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "Correct order for graceful shutdown of a Go service on SIGTERM?",
   "a": "Fail readiness, wait for endpoint removal (preStop sleep), http.Server.Shutdown with a budget below the grace period, stop workers, flush telemetry, close DB pools.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "What changed for GOMAXPROCS in Go 1.25?",
   "a": "On Linux the default respects the cgroup CPU limit (when lower than the CPU count) and is updated if the limit changes; applies when go.mod says go 1.25+ and GOMAXPROCS is not set.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Why set GOMEMLIMIT in a container, and to what?",
   "a": "Go does not read the cgroup memory limit; without a soft limit the heap can overshoot and get OOMKilled (exit 137). Set it to roughly 90% of the container memory limit.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Total DB connections with HPA scaling?",
   "a": "replicas x per-replica SetMaxOpenConns — size the pool from the database's max_connections budget at maxReplicas, or add a pooler like PgBouncer.",
   "d": 3,
   "cat": "cloud-native"
  },
  {
   "q": "Exponential backoff with full jitter formula?",
   "a": "sleep = random(0, min(cap, base * 2^attempt)); retry only transient errors on idempotent operations and stop when the context is done.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "client-go: typed clientset vs dynamic client?",
   "a": "Typed clientset (kubernetes.NewForConfig) gives compile-time Go types for built-in APIs; the dynamic client works with any GroupVersionResource via unstructured.Unstructured — use it for CRDs without generated types or generic tools.",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "What are client-go rest.Config default QPS and Burst?",
   "a": "QPS 5 and Burst 10 — raise them for controllers that make many API calls; the server also applies API Priority and Fairness.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Informer pipeline in one line?",
   "a": "Reflector (List + Watch) -> DeltaFIFO -> Indexer (local cache) -> event handlers -> workqueue keys -> workers reading from listers.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Why must you DeepCopy objects returned by a lister?",
   "a": "Listers return pointers into the shared informer cache; mutating them corrupts the cache for every other consumer in the process.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Level-triggered vs edge-triggered reconciliation?",
   "a": "Level-triggered reconcile recomputes from current desired vs actual state given only a key, so missed or duplicated events are harmless; edge-triggered reacts to individual change events and breaks when events are lost.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "What happens when you delete an object that has finalizers?",
   "a": "The API server sets metadata.deletionTimestamp and keeps the object; controllers perform cleanup and remove their finalizer, and the object is deleted once the finalizers list is empty.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "controller-runtime: error vs RequeueAfter vs nil result?",
   "a": "Returning an error requeues with exponential backoff; Result{RequeueAfter: d} re-runs after d without signalling failure; Result{} with nil waits for the next watch event.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Which object backs Kubernetes leader election, and the typical timings?",
   "a": "A coordination.k8s.io/v1 Lease; LeaseDuration 15s, RenewDeadline 10s, RetryPeriod 2s.",
   "d": 3,
   "cat": "cloud-native"
  },
  {
   "q": "GMP: what happens to the P when a goroutine enters a blocking syscall?",
   "a": "sysmon retakes the P after a short time (>= ~20 µs) and hands it to another M so other goroutines keep running; the original M reacquires a P (or queues the G) when the syscall returns.",
   "d": 3,
   "cat": "cloud-native"
  },
  {
   "q": "How does Go preempt a goroutine stuck in a tight loop?",
   "a": "Asynchronous preemption (Go 1.14+): sysmon notices it has run > 10 ms and signals its thread (SIGURG) so the runtime can stop it at a safe point.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "GOGC vs GOMEMLIMIT?",
   "a": "GOGC sets heap growth between collections relative to live heap (100 = about 2x); GOMEMLIMIT is a soft cap on total runtime memory that makes the GC work harder as it is approached. Use GOMEMLIMIT ~90% of the container limit.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Name four common reasons a value escapes to the heap.",
   "a": "Returning its address, storing it in a global/heap object/channel, converting it to an interface consumed by non-inlined code (e.g. fmt), being captured by an escaping closure, or being too large/variable-size for the stack.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "What is false sharing and the usual fix?",
   "a": "Independent variables written by different cores share one 64-byte cache line, causing coherence ping-pong. Fix by padding hot per-core data to a cache line or by accumulating locally and publishing once.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Why prefer for b.Loop() in Go 1.24+ benchmarks?",
   "a": "Setup and cleanup are automatically excluded from timing, the function runs once per measurement, and the loop body cannot be optimised away by the compiler.",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "inuse_space vs alloc_space in a heap profile?",
   "a": "inuse_space = memory live at profile time (find leaks); alloc_space = total bytes allocated since start (find GC pressure / hot allocation sites).",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "How do you enable PGO for a Go binary?",
   "a": "Save a representative production CPU profile as default.pgo in the main package directory; go build uses it automatically (-pgo=auto, default since Go 1.21).",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "Accept interfaces, return structs — why?",
   "a": "Consumers declare small interfaces for what they need (decoupling, easy fakes) while constructors return concrete types so callers keep full functionality and you avoid speculative abstractions.",
   "d": 1,
   "cat": "cloud-native"
  },
  {
   "q": "Data structures for O(1) LRU and O(1) LFU caches?",
   "a": "LRU: hash map + doubly linked list ordered by recency. LFU: key map + map of frequency -> doubly linked list, plus a minFreq counter for O(1) eviction.",
   "d": 2,
   "cat": "cloud-native"
  },
  {
   "q": "Why do lease-based distributed locks need fencing tokens?",
   "a": "A paused holder can outlive its lease while another client acquires the lock; a monotonically increasing token checked by the storage layer rejects the stale holder's writes.",
   "d": 3,
   "cat": "cloud-native"
  },
  {
   "q": "What does the transactional outbox guarantee?",
   "a": "The business change and its event are committed in one DB transaction; a relay publishes outbox rows afterwards, giving at-least-once delivery without dual-write inconsistencies (consumers dedupe by event ID).",
   "d": 3,
   "cat": "cloud-native"
  },
  {
   "q": "How are Go maps implemented since Go 1.24?",
   "a": "Swiss tables: groups of 8 slots plus a control word of 7-bit hash fragments probed in parallel, max load 7/8, and per-table growth; tables over 1024 slots split via an extendible-hashing directory.",
   "d": 3,
   "cat": "data_structures"
  },
  {
   "q": "eface vs iface?",
   "a": "any (eface) = (*_type, data). A non-empty interface (iface) = (*itab, data), where the itab holds the interface type, the concrete type and the method table.",
   "d": 3,
   "cat": "oop"
  },
  {
   "q": "Why loop around sync.Cond.Wait if Go has no spurious wakeups?",
   "a": "The lock is re-acquired after the waker releases it, so another goroutine may consume the condition first, and Broadcast wakes every waiter.",
   "d": 2,
   "cat": "concurrency"
  },
  {
   "q": "Does net/http retry requests automatically?",
   "a": "Only replayable ones (idempotent method or Idempotency-Key, rewindable body) when a reused keep-alive connection fails before any response bytes arrive. Never on 5xx or timeouts.",
   "d": 3,
   "cat": "networking"
  },
  {
   "q": "What is iter.Seq and when did range-over-func arrive?",
   "a": "type Seq[V any] func(yield func(V) bool), Go 1.23. The loop body becomes yield; it returns false on break and the iterator must stop.",
   "d": 2,
   "cat": "advanced"
  },
  {
   "q": "What does testing/synctest do?",
   "a": "Go 1.25: runs a test in a bubble with a fake clock that advances when all bubble goroutines are blocked; leftover blocked goroutines fail the test as a deadlock.",
   "d": 2,
   "cat": "advanced"
  },
  {
   "q": "time.After in a loop: still a leak?",
   "a": "Not since Go 1.23 (unreferenced timers are GC'd and timer channels are synchronous), but it allocates a timer per call, so reuse one with Reset in hot loops.",
   "d": 2,
   "cat": "concurrency"
  },
  {
   "q": "When is sync.RWMutex slower than sync.Mutex?",
   "a": "With tiny critical sections or many cores: every RLock/RUnlock is an atomic on a shared reader count, whose cache line bounces between CPUs.",
   "d": 3,
   "cat": "concurrency"
  },
  {
   "q": "What does sync.WaitGroup.Go do?",
   "a": "Go 1.25: wg.Go(f) = Add(1) + go f() + Done(), removing the Add-inside-the-goroutine bug.",
   "d": 1,
   "cat": "concurrency"
  },
  {
   "q": "omitzero vs omitempty?",
   "a": "omitzero (Go 1.24) omits zero values including zero structs and time.Time{} (or via an IsZero method); omitempty omits false/0/\"\"/nil/empty collections but never structs.",
   "d": 2,
   "cat": "networking"
  }
 ]
});
