function bigFloat(n) {
    let numer = 0n
    let denom_exp = 0n
    for (; ;) {
        const int_part = Math.floor(n)
        numer += BigInt(int_part)
        n -= int_part
        if (n === 0) break
        n *= 2
        numer <<= 1n
        denom_exp++
    }
    return { numer, denom_exp }
}

function bigFloat_toFloat(n) {
    let result = 0
    let { numer, denom_exp } = n
    let current_denom = 1n << denom_exp
    let current_exp = 1
    for (; (numer !== 0n) && (result !== (result + current_exp));) {
        const x = numer / current_denom
        numer -= current_denom * x
        result += current_exp * Number(x)
        current_denom >>= 1n
        current_exp /= 2
    }
    return result
}

function bigFloat_neg(n) {
    return {
        numer: -n.numer,
        denom_exp: n.denom_exp
    }
}

function bigFloat_add(n, m) {
    let numer, denom_exp
    if (n.denom_exp < m.denom_exp) {
        numer = (1n << (m.denom_exp - n.denom_exp)) * n.numer + m.numer
        denom_exp = m.denom_exp
    } else {
        numer = n.numer + (1n << (n.denom_exp - m.denom_exp)) * m.numer
        denom_exp = n.denom_exp
    }
    while (((numer & 1n) === 0n) && (denom_exp !== 0n)) {
        numer /= 2n
        denom_exp--
    }
    return { numer, denom_exp }
}

function bigFloat_sub(n, m) {
    return bigFloat_add(n, bigFloat_neg(m))
}

function bigFloat_mul(n, m) {
    return {
        numer: n.numer * m.numer,
        denom_exp: n.denom_exp + m.denom_exp,
    }
}

const bigFloat_ZERO = bigFloat(0)
const bigFloat_ONE = bigFloat(1)
