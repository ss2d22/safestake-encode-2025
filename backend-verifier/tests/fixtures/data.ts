export const validProof = `{
  "accountAddress": "4LqPVpPmpsznqS9QEhNMDSi2UwKUrGKkdo5qc7mGjgeNkZMYq7",
  "proof": {
    "presentationContext": "6650a7bd33b48f886e6224c319ebe5d925aecb78582d38a37ec926759de290b3",
    "proof": {
      "created": "2025-10-24T18:02:02.878Z",
      "proofValue": [],
      "type": "ConcordiumWeakLinkingProofV1"
    },
    "type": "VerifiablePresentation",
    "verifiableCredential": [
      {
        "credentialSubject": {
          "id": "did:ccd:testnet:cred:a49e86a6130a9aa4b60e97558a6fd7003a7f9fe55be4151661a66048d4f8ec5841a997fa42bc928097edeb0796bc3f7b",
          "proof": {
            "created": "2025-10-24T18:02:02.878Z",
            "proofValue": [
              {
                "proof": "a15cf7a0c4ecdefc2026ea2ed37b3e1dcda433f9876900f4667c7e595e0c1233871fa52d457414e59f23b09a73f5604993ef48e783529bd06bca926f023667d3a8fe312bcc38b4710da7e5e2e259b58e5cd200e43b00c61476cd9789ed2224668accec224512adef2fdeebf21666dace5f61102c57aed6810181bdd55d612eaee917d6f41854db2a10662b36d4b0616984d9ec919151737f439c0a0d540f34bc69888078020637e5af71c1bb75baa59273c9cde89506c68eed3c09341e29ef7e30636506cd1c2ca83a68608de0396f41625fbeb32c6c167b8fa304768ae96a18009ce304f58faf32447c37c46d14681b27db09f9fec36b70e208418096e3427c0aabf49e8117cb1625fd26daa56a9b9dc17c2645fa13e2e9a1b8f9c4f839c20b000000078852e41adc72f90dc0be7f2c90eb5c96ecf481103c12ccf300ca072c9efaa1acf4965cd00274fc70455ff22f0a9ffb688f2cca53119f52cbde8d6ccbc48014b593661ae479033785f8d8ebc60051564f5d6a242859756ef86d2bd52321ce77919531188f91a771c0366c24f94b473f7a1feb3c5464ea59bfe361b44f01cea973d22d6fed5feb4d7492720b0ec1c0a56aac5462b0f93402e585ac7e79e687d87641a289ee8e72d02bbd6e79bbc0cd60d01a1dc3ec7d9a522851ac074e65b8c20db05708fb57c94772b015869886b822728b71d7eabf4a4069058bf7483269efc1f043ceaa9e886feef0a524ea2f44d16bb6b955189a316b8740b224b730d3fbeefc7393682933a5e3c3973cb8703ec4fcc9268504dcd215fadd539363c38083e88d612bdc7d31ae0a79bb881087738779199ee007594c4ce49b0c3b57c5f2c9b590fa3b607587fb3b5578933353e6adfcb4f72d0cd6e288367cf7cd27dd2aa2a3208a5cdd04469dbd0d18bc8e523edce01c35ba11819b6689f687b02c8dd1e8ffacacc147a49fff9baa12cbfa8b6753c5c02ab9efa47d06d06893ac084eea0802aa79dc5b343864e780764ce72b7d579eb605655ad2a76e53ad62e1cea102430961757f7f4e2d2d3be37c9a58167a4216ac454e6de0420a7fa1df3ee44914f200b96559975b7936a191af139e532cdf1befeab9cf71a274f7617f29e9fda45497097ffe2639873cd905641493a55b5e1889c9fe6ff5f4e3fd9b7697b13e09a2ee4d321ce5eca51f9cc9220d33008ccf6bac2216d84c7706f4b354afcdad57049babd6fe40401ab6f4b6f7370b87b473939c4d37667ba96d44b1126102bbc9153bf90d83a6db7ab4ab20049250445acb7db9d0637b02ab86b5ba7aefe8682ff3c3c5c4961a05224cb0524b0dfaf9d11e97a41a02e030b573bb7dc3e2a960cc021816e35a4fc45bee847deb1d0e984d357d7897dfadef0b954b359e56c6be35848b25f3943d8320b2ddecbeba6d8a24beefde50b6a47fefd18496b9b5600296ee78",
                "type": "AttributeInRange"
              }
            ],
            "type": "ConcordiumZKProofV3"
          },
          "statement": [
            {
              "attributeTag": "dob",
              "lower": "18000101",
              "type": "AttributeInRange",
              "upper": "20071025"
            }
          ]
        },
        "issuer": "did:ccd:testnet:idp:0",
        "type": ["VerifiableCredential", "ConcordiumVerifiableCredential"]
      }
    ]
  }
}`;

export const invalidProof = `{
  "accountAddress": "4LqPVpPmpsznqS9QEhNMDSi2UwKUrGKkdo5qc7mGjgeNkZMYq7",
  "proof": {
    "presentationContext": "invalid_context_12345",
    "proof": {
      "created": "2025-10-24T18:02:02.878Z",
      "proofValue": [],
      "type": "ConcordiumWeakLinkingProofV1"
    },
    "type": "VerifiablePresentation",
    "verifiableCredential": []
  }
}`;
