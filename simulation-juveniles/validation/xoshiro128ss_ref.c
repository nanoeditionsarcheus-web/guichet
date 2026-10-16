/* Code de référence de xoshiro128** (D. Blackman et S. Vigna, 2018, domaine public,
   https://prng.di.unimi.it/xoshiro128starstar.c), et splitmix32 (mélangeur de MurmurHash3) pour
   initialiser l'état à partir d'une graine de 32 bits. Imprime les sorties pour comparaison. */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
static inline uint32_t rotl(const uint32_t x, int k) { return (x << k) | (x >> (32 - k)); }
static uint32_t s[4];
uint32_t next(void) {
	const uint32_t result = rotl(s[1] * 5, 7) * 9;
	const uint32_t t = s[1] << 9;
	s[2] ^= s[0];
	s[3] ^= s[1];
	s[1] ^= s[2];
	s[0] ^= s[3];
	s[2] ^= t;
	s[3] = rotl(s[3], 11);
	return result;
}
static uint32_t x;
uint32_t splitmix32(void) {
	uint32_t z = (x += 0x9e3779b9u);
	z = (z ^ (z >> 16)) * 0x85ebca6bu;
	z = (z ^ (z >> 13)) * 0xc2b2ae35u;
	return z ^ (z >> 16);
}
int main(int argc, char **argv) {
	long n = atol(argv[2]);
	if (argv[1][0] == 'e') { s[0] = 1; s[1] = 2; s[2] = 3; s[3] = 4; }          /* état {1,2,3,4} */
	else { x = (uint32_t)strtoul(argv[1], 0, 10); for (int i = 0; i < 4; i++) s[i] = splitmix32(); }
	for (long i = 0; i < n; i++) printf("%u\n", next());
	return 0;
}
