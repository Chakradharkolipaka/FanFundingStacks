;; NFT Donation -- FanFunding on Stacks
;; A Clarity smart contract for minting NFTs and accepting STX donations.

;; --- Constants ------------------------------------------
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_INVALID_TOKEN_ID (err u100))
(define-constant ERR_ZERO_DONATION (err u101))
(define-constant ERR_TRANSFER_FAILED (err u102))
(define-constant ERR_NOT_FOUND (err u103))
(define-constant ERR_METADATA_FROZEN (err u104))
(define-constant ERR_SELF_DONATION (err u105))

;; --- NFT Definition -------------------------------------
;; SIP-009 compliant NFT
(define-non-fungible-token fan-token uint)

;; --- Data Variables -------------------------------------
;; Auto-incrementing token ID counter (starts at 0, first mint = 1)
(define-data-var token-id-counter uint u0)

;; --- Data Maps ------------------------------------------
;; token-id -> token URI (IPFS metadata URL)
(define-map token-uris uint (string-ascii 256))

;; token-id -> creator (original minter)
(define-map token-creators uint principal)

;; token-id -> total donations in microSTX
(define-map total-donations uint uint)

;; --- SIP-009 Read-Only Functions ------------------------

(define-read-only (get-last-token-id)
  (ok (var-get token-id-counter))
)

(define-read-only (get-token-uri (token-id uint))
  (ok (map-get? token-uris token-id))
)

(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? fan-token token-id))
)

;; --- Custom Read-Only Functions -------------------------

(define-read-only (get-total-donations (token-id uint))
  (ok (default-to u0 (map-get? total-donations token-id)))
)

(define-read-only (get-creator (token-id uint))
  (ok (map-get? token-creators token-id))
)

(define-read-only (get-total-supply)
  (ok (var-get token-id-counter))
)

;; --- Public Functions -----------------------------------

;; Mint a new NFT with a token URI (e.g., IPFS metadata URL).
;; Anyone can mint. The minter becomes the creator/owner.
(define-public (mint-nft (token-uri (string-ascii 256)))
  (let
    (
      (new-id (+ (var-get token-id-counter) u1))
    )
    ;; Mint the NFT to the caller
    (try! (nft-mint? fan-token new-id tx-sender))

    ;; Store metadata
    (map-set token-uris new-id token-uri)
    (map-set token-creators new-id tx-sender)
    (map-set total-donations new-id u0)

    ;; Increment counter
    (var-set token-id-counter new-id)

    ;; Print event for indexing
    (print {
      event: "mint",
      token-id: new-id,
      creator: tx-sender,
      token-uri: token-uri
    })

    (ok new-id)
  )
)

;; Donate STX to the creator of a given token.
;; The STX is transferred directly from the donor to the NFT creator.
(define-public (donate (token-id uint) (amount uint))
  (let
    (
      (creator (unwrap! (map-get? token-creators token-id) ERR_INVALID_TOKEN_ID))
      (current-total (default-to u0 (map-get? total-donations token-id)))
    )
    ;; Validate amount > 0
    (asserts! (> amount u0) ERR_ZERO_DONATION)

    ;; Prevent self-donation (stx-transfer? fails with err u2 when sender = recipient)
    (asserts! (not (is-eq tx-sender creator)) ERR_SELF_DONATION)

    ;; Transfer STX from donor to creator
    (try! (stx-transfer? amount tx-sender creator))

    ;; Update total donations
    (map-set total-donations token-id (+ current-total amount))

    ;; Print event for indexing
    (print {
      event: "donation",
      token-id: token-id,
      donor: tx-sender,
      amount: amount,
      creator: creator
    })

    (ok true)
  )
)

;; --- Transfer (SIP-009) ---------------------------------

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) (err u403))
    (nft-transfer? fan-token token-id sender recipient)
  )
)
